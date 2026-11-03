from django.db import models
from django.conf import settings
from django.utils import timezone
from simple_history.models import HistoricalRecords
from backend.invoices.models import Invoice

class Payment(models.Model):
    METHOD_CHOICES = (
        ('BANK_TRANSFER', 'Bank Transfer (NEFT/RTGS)'),
        ('UPI', 'UPI Payment'),
        ('CREDIT_CARD', 'Credit / Debit Card'),
        ('CHEQUE', 'Cheque'),
        ('CASH', 'Cash'),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_method = models.CharField(max_length=32, choices=METHOD_CHOICES, default='BANK_TRANSFER')
    transaction_reference = models.CharField(max_length=128)
    notes = models.TextField(blank=True, null=True)

    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Payment of ₹{self.amount} for {self.invoice.invoice_number} ({self.transaction_reference})"

