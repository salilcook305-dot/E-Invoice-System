from decimal import Decimal
from rest_framework.exceptions import ValidationError

IMMUTABLE_STATUSES = ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID')

def assert_invoice_is_mutable(invoice):
    """
    Ensures that an invoice is in DRAFT state before permitting edits to its line items,
    financial figures, customer reference, or tax rates.
    """
    if invoice.status in IMMUTABLE_STATUSES:
        raise ValidationError({
            "detail": f"Invoice {invoice.invoice_number} is locked in '{invoice.status}' state and is immutable. Financial records cannot be altered."
        })

def validate_payment_not_overpaid(invoice, new_payment_amount):
    """
    Validates that the incoming payment does not exceed the remaining unpaid balance.
    """
    new_amount = Decimal(str(new_payment_amount))
    if new_amount <= Decimal('0.00'):
        raise ValidationError({
            "amount": "Payment amount must be greater than zero."
        })
        
    remaining = Decimal(str(invoice.balance_remaining))
    if new_amount > remaining:
        raise ValidationError({
            "amount": f"Overpayment blocked! Remaining balance is ₹{remaining:,.2f}, cannot accept payment of ₹{new_amount:,.2f}."
        })

