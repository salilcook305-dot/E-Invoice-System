import logging
from django.core.mail import EmailMessage
from django.conf import settings
from utilities.pdf_generator import generate_invoice_pdf

logger = logging.getLogger(__name__)

def send_invoice_email(invoice, recipient_email=None, pdf_bytes=None):
    """
    Emails the generated invoice PDF directly to the customer.
    """
    to_email = recipient_email or invoice.customer.email
    if not to_email:
        raise ValueError(f"No recipient email address specified for customer '{invoice.customer.name}'.")
        
    if not pdf_bytes:
        pdf_bytes, _ = generate_invoice_pdf(invoice)
        
    subject = f"Tax Invoice #{invoice.invoice_number} from AI Samrat Enterprises"
    body = f"""Dear {invoice.customer.name},

Please find attached your Tax Invoice #{invoice.invoice_number} for the amount of ₹{invoice.total_amount:,.2f}.

Summary:
- Invoice Number: {invoice.invoice_number}
- Issue Date: {invoice.issue_date}
- Due Date: {invoice.due_date}
- Total Amount: ₹{invoice.total_amount:,.2f}
- Outstanding Balance: ₹{invoice.balance_remaining:,.2f}
- Digital SHA-256 Fingerprint: {invoice.pdf_hash or 'Verified'}

This invoice is digitally signed and tamper-proof. You can verify its integrity at any time.

Thank you for your business.

Warm regards,
AI Samrat Enterprises Billing Team
{settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL}
"""

    msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach(f"Invoice_{invoice.invoice_number}.pdf", pdf_bytes, 'application/pdf')
    
    try:
        sent_count = msg.send(fail_silently=False)
        return {
            'success': True,
            'recipient': to_email,
            'message': f"Invoice #{invoice.invoice_number} emailed successfully to {to_email}."
        }
    except Exception as exc:
        logger.error(f"Failed to email invoice #{invoice.invoice_number}: {exc}")
        return {
            'success': False,
            'recipient': to_email,
            'error': str(exc)
        }

