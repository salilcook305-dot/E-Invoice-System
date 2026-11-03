from django.http import HttpResponse, Http404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from backend.invoices.models import Invoice
from utilities.pdf_generator import generate_invoice_pdf

class InvoicePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk, is_deleted=False)
        except Invoice.DoesNotExist:
            raise Http404("Invoice not found")

        pdf_bytes, pdf_hash = generate_invoice_pdf(invoice)
        if not invoice.pdf_hash:
            invoice.pdf_hash = pdf_hash
            invoice.save(update_fields=['pdf_hash'])

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
        response['X-EIS-SHA256-Fingerprint'] = pdf_hash
        return response

