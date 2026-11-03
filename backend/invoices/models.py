import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from simple_history.models import HistoricalRecords
from backend.customers.models import Customer
from backend.products.models import Product
from backend.validation.calculator import calculate_item_financials, recalculate_invoice_totals
from security.data_immutability import assert_invoice_is_mutable

class Invoice(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('VOID', 'Void / Cancelled'),
    )

    invoice_number = models.CharField(max_length=64, unique=True, db_index=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    
    # Financial fields (backend computed only)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance_remaining = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # Security & Tamper-proof verification
    pdf_hash = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    pdf_file = models.FileField(upload_to='invoices_pdf/', blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invoices'
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_invoices'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.invoice_number} ({self.status}) - ₹{self.total_amount}"

    @classmethod
    def generate_unique_number(cls):
        """Generates standard sequential or readable invoice code e.g. INV-2026-XXXX"""
        prefix = f"INV-{timezone.now().year}"
        count = cls.objects.filter(invoice_number__startswith=prefix).count() + 1
        candidate = f"{prefix}-{count:04d}"
        while cls.objects.filter(invoice_number=candidate).exists():
            count += 1
            candidate = f"{prefix}-{count:04d}"
        return candidate

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_unique_number()
        super().save(*args, **kwargs)

    def update_financial_status(self, save=True):
        """
        Dynamically updates invoice status according to payments and due date.
        """
        if self.status == 'VOID':
            return self.status

        if self.total_amount > Decimal('0.00') and self.paid_amount >= self.total_amount:
            self.status = 'PAID'
            self.balance_remaining = Decimal('0.00')
        elif self.paid_amount > Decimal('0.00') and self.paid_amount < self.total_amount:
            self.status = 'PARTIALLY_PAID'
            self.balance_remaining = max(Decimal('0.00'), self.total_amount - self.paid_amount)
        elif self.status != 'DRAFT':
            today = timezone.now().date()
            if self.due_date and self.due_date < today and self.balance_remaining > Decimal('0.00'):
                self.status = 'OVERDUE'
            elif self.status not in ('ISSUED', 'OVERDUE'):
                self.status = 'ISSUED'

        if save:
            self.save(update_fields=['status', 'balance_remaining', 'updated_at'])
        return self.status


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='invoice_items')
    description = models.TextField(blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    
    # Financial fields (backend calculated)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Enforce server-side calculation of item values
        calcs = calculate_item_financials(self.quantity, self.unit_price, self.gst_rate)
        self.subtotal = calcs['subtotal']
        self.tax_amount = calcs['tax_amount']
        self.total_amount = calcs['total_amount']
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x {self.quantity} on {self.invoice.invoice_number}"

