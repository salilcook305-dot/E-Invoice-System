from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from security.role_based_access import IsStaffOrAdmin
from backend.audit_log.models import record_audit_log
from .models import Payment
from .serializers import PaymentSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('invoice', 'recorded_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsStaffOrAdmin]
    http_method_names = ['get', 'post', 'head', 'options']  # Payments are immutable, no direct PUT/DELETE

    def get_queryset(self):
        qs = Payment.objects.all().select_related('invoice__customer', 'recorded_by')
        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        return qs.order_by('-payment_date', '-created_at')

    def perform_create(self, serializer):
        payment = serializer.save()
        record_audit_log(
            entity_name='Payment',
            entity_id=payment.id,
            action='PAYMENT',
            user=self.request.user,
            changes={
                'invoice': payment.invoice.invoice_number,
                'amount': str(payment.amount),
                'method': payment.payment_method,
                'reference': payment.transaction_reference,
                'invoice_new_status': payment.invoice.status,
                'invoice_balance_remaining': str(payment.invoice.balance_remaining)
            },
            request=self.request
        )

