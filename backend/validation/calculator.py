from decimal import Decimal, ROUND_HALF_UP

def round_currency(val):
    return Decimal(str(val)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def calculate_item_financials(quantity, unit_price, gst_rate):
    """
    Backend-only line item financial computation.
    """
    qty = Decimal(str(quantity))
    price = Decimal(str(unit_price))
    rate = Decimal(str(gst_rate))

    subtotal = round_currency(qty * price)
    tax_amount = round_currency(subtotal * (rate / Decimal('100.00')))
    total_amount = round_currency(subtotal + tax_amount)

    return {
        'subtotal': subtotal,
        'tax_amount': tax_amount,
        'total_amount': total_amount
    }

def recalculate_invoice_totals(invoice, save=False):
    """
    Recalculates invoice totals based on saved line items.
    Enforces that totals and tax calculations come strictly from the backend.
    """
    items = invoice.items.all()
    subtotal = Decimal('0.00')
    tax_amount = Decimal('0.00')

    for item in items:
        subtotal += Decimal(str(item.subtotal))
        tax_amount += Decimal(str(item.tax_amount))

    discount = Decimal(str(invoice.discount_amount or 0.00))
    total_amount = max(Decimal('0.00'), round_currency(subtotal + tax_amount - discount))
    paid_amount = Decimal(str(invoice.paid_amount or 0.00))
    balance_remaining = max(Decimal('0.00'), round_currency(total_amount - paid_amount))

    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total_amount = total_amount
    invoice.balance_remaining = balance_remaining

    if save:
        invoice.save(update_fields=['subtotal', 'tax_amount', 'total_amount', 'balance_remaining', 'updated_at'])

    return invoice

