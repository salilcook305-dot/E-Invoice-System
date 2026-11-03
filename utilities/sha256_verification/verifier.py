def verify_invoice_document(hash_string=None):
    """
    Verifies the integrity of an invoice against registered records in the database.
    Accepts a raw SHA-256 hash string.
    """
    from backend.invoices.models import Invoice

    target_hash = None
    if hash_string:
        target_hash = hash_string.strip().upper()
        
    if not target_hash:
        return {
            'verified': False,
            'status': 'INVALID_INPUT',
            'message': 'No SHA-256 hash string was provided.'
        }
        
    try:
        invoice = Invoice.objects.filter(pdf_hash__iexact=target_hash, is_deleted=False).first()
        if invoice:
            return {
                'verified': True,
                'status': 'AUTHENTIC',
                'computed_hash': target_hash,
                'invoice': {
                    'id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'customer_name': invoice.customer.name,
                    'issue_date': str(invoice.issue_date),
                    'total_amount': float(invoice.total_amount),
                    'status': invoice.status,
                    'created_at': str(invoice.created_at),
                },
                'message': f"Document verified as authentic! Matches Invoice #{invoice.invoice_number}."
            }
        else:
            return {
                'verified': False,
                'status': 'TAMPERED_OR_UNKNOWN',
                'computed_hash': target_hash,
                'message': 'Verification failed. No matching official invoice found with this cryptographic SHA-256 fingerprint.'
            }
    except Exception as exc:
        return {
            'verified': False,
            'status': 'ERROR',
            'computed_hash': target_hash,
            'message': f"Verification error: {str(exc)}"
        }
