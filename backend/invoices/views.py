from decimal import Decimal
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from security.role_based_access import IsStaffOrAdmin, IsAdminRole, CanVoidInvoice
from security.data_immutability import assert_invoice_is_mutable
from backend.audit_log.models import record_audit_log
from utilities.pdf_generator import generate_invoice_pdf
from utilities.email_service import send_invoice_email
from utilities.sha256_verification import verify_invoice_document

from .models import Invoice, InvoiceItem
from .serializers import InvoiceSerializer, InvoiceListSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_deleted=False)
    permission_classes = [IsStaffOrAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def get_queryset(self):
        qs = Invoice.objects.filter(is_deleted=False).select_related('customer', 'created_by').prefetch_related('items__product')
        
        # Check overdue status on query
        today = timezone.now().date()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
            
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
            
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__gstin__icontains=search)
            )

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        invoice = serializer.save()
        record_audit_log(
            entity_name='Invoice',
            entity_id=invoice.id,
            action='CREATE',
            user=self.request.user,
            changes={
                'invoice_number': invoice.invoice_number,
                'customer': invoice.customer.name,
                'total_amount': str(invoice.total_amount),
                'status': invoice.status
            },
            request=self.request
        )

    def perform_update(self, serializer):
        invoice = serializer.save()
        record_audit_log(
            entity_name='Invoice',
            entity_id=invoice.id,
            action='UPDATE',
            user=self.request.user,
            changes={'status': invoice.status, 'total_amount': str(invoice.total_amount)},
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        # Soft delete
        invoice.is_deleted = True
        invoice.deleted_at = timezone.now()
        invoice.deleted_by = request.user
        invoice.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
        
        record_audit_log(
            entity_name='Invoice',
            entity_id=invoice.id,
            action='DELETE',
            user=request.user,
            changes={'soft_deleted': True},
            request=request
        )
        return Response({'status': f'Invoice {invoice.invoice_number} soft-deleted successfully.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def next_number(self, request):
        """
        Returns the next available sequential invoice number for creation.
        """
        return Response({'next_invoice_number': Invoice.generate_unique_number()})

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        """
        Transitions invoice from DRAFT to ISSUED, renders PDF, and computes SHA-256 fingerprint.
        """
        invoice = self.get_object()
        if invoice.status != 'DRAFT' and invoice.pdf_hash:
            return Response(
                {'detail': f'Invoice {invoice.invoice_number} is already issued with hash {invoice.pdf_hash}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        pdf_bytes, pdf_hash = generate_invoice_pdf(invoice)
        invoice.pdf_hash = pdf_hash
        invoice.status = 'ISSUED'
        invoice.save(update_fields=['pdf_hash', 'status', 'updated_at'])

        record_audit_log(
            entity_name='Invoice',
            entity_id=invoice.id,
            action='ISSUE',
            user=request.user,
            changes={'status': 'ISSUED', 'pdf_hash': pdf_hash},
            request=request
        )

        return Response({
            'status': 'ISSUED',
            'invoice_number': invoice.invoice_number,
            'pdf_hash': pdf_hash,
            'message': 'Invoice issued successfully and locked with cryptographic SHA-256 fingerprint.'
        })

    @action(detail=True, methods=['post'], permission_classes=[CanVoidInvoice])
    def void(self, request, pk=None):
        """
        Administrative void/cancellation of an invoice with required reason.
        """
        invoice = self.get_object()
        if invoice.status == 'VOID':
            return Response({'detail': 'Invoice is already voided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'A reason is required to void an invoice.'}, status=status.HTTP_400_BAD_REQUEST)
            
        prev_status = invoice.status
        invoice.status = 'VOID'
        invoice.notes = f"{invoice.notes or ''}\n[VOIDED on {timezone.now().strftime('%Y-%m-%d %H:%M')}] Reason: {reason}".strip()
        invoice.save(update_fields=['status', 'notes', 'updated_at'])

        record_audit_log(
            entity_name='Invoice',
            entity_id=invoice.id,
            action='VOID',
            user=request.user,
            changes={'previous_status': prev_status, 'status': 'VOID', 'reason': reason},
            request=request
        )

        return Response({
            'status': 'VOID',
            'invoice_number': invoice.invoice_number,
            'message': f"Invoice {invoice.invoice_number} has been voided by admin."
        })

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Generates and streams the PDF invoice document with SHA-256 header.
        """
        invoice = self.get_object()
        pdf_bytes, pdf_hash = generate_invoice_pdf(invoice)

        # Update hash if not present
        if not invoice.pdf_hash:
            invoice.pdf_hash = pdf_hash
            invoice.save(update_fields=['pdf_hash'])

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
        response['X-EIS-SHA256-Fingerprint'] = pdf_hash
        return response

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """
        Dispatches invoice PDF via email to client.
        """
        invoice = self.get_object()
        recipient = request.data.get('recipient_email')
        result = send_invoice_email(invoice, recipient_email=recipient)

        if result.get('success'):
            record_audit_log(
                entity_name='Invoice',
                entity_id=invoice.id,
                action='EMAIL',
                user=request.user,
                changes={'recipient': result.get('recipient')},
                request=request
            )
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Aggregates dashboard KPI metrics, status breakdown, and recent invoices.
        """
        active_invoices = Invoice.objects.filter(is_deleted=False)
        non_void = active_invoices.exclude(status='VOID')

        total_invoiced = non_void.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_collected = non_void.aggregate(paid=Sum('paid_amount'))['paid'] or Decimal('0.00')
        total_outstanding = non_void.aggregate(bal=Sum('balance_remaining'))['bal'] or Decimal('0.00')

        # Status counts
        status_counts = {
            'DRAFT': active_invoices.filter(status='DRAFT').count(),
            'ISSUED': active_invoices.filter(status='ISSUED').count(),
            'PARTIALLY_PAID': active_invoices.filter(status='PARTIALLY_PAID').count(),
            'PAID': active_invoices.filter(status='PAID').count(),
            'OVERDUE': active_invoices.filter(status='OVERDUE').count(),
            'VOID': active_invoices.filter(status='VOID').count(),
        }

        # Monthly trends (last 6 months)
        trends = []
        now = timezone.now()
        for i in range(5, -1, -1):
            month_date = now - timezone.timedelta(days=i * 30)
            month_invoices = non_void.filter(
                issue_date__year=month_date.year,
                issue_date__month=month_date.month
            )
            trends.append({
                'month': month_date.strftime('%b %Y'),
                'total': float(month_invoices.aggregate(s=Sum('total_amount'))['s'] or 0.0),
                'collected': float(month_invoices.aggregate(s=Sum('paid_amount'))['s'] or 0.0),
                'count': month_invoices.count()
            })

        # Recent 5 invoices
        recent = InvoiceListSerializer(active_invoices[:5], many=True).data

        return Response({
            'total_invoiced': float(total_invoiced),
            'total_collected': float(total_collected),
            'total_outstanding': float(total_outstanding),
            'status_counts': status_counts,
            'total_count': active_invoices.count(),
            'trends': trends,
            'recent_invoices': recent
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def verify(self, request):
        """
        Public / authenticated endpoint to verify invoice authenticity via SHA-256 hash or invoice number.
        """
        hash_str = request.data.get('hash')
        invoice_num = request.data.get('invoice_number')

        if not hash_str and not invoice_num:
            return Response(
                {'error': 'Please provide either an invoice number or a SHA-256 hash.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if invoice_num and not hash_str:
            inv = Invoice.objects.filter(invoice_number__iexact=invoice_num.strip(), is_deleted=False).first()
            if inv:
                hash_str = inv.pdf_hash

        result = verify_invoice_document(hash_string=hash_str)
        
        # Log verification attempt in audit log
        user = request.user if request.user.is_authenticated else None
        record_audit_log(
            entity_name='SecurityVerification',
            entity_id=result.get('computed_hash', 'UNKNOWN'),
            action='VERIFY',
            user=user,
            changes={'status': result.get('status'), 'verified': result.get('verified')},
            request=request
        )

        return Response(result)
