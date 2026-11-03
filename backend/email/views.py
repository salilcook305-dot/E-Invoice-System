from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from backend.invoices.models import Invoice
from backend.audit_log.models import record_audit_log
from utilities.email_service import send_invoice_email

class SendInvoiceEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, is_deleted=False)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

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

