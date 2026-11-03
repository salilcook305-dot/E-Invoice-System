from decimal import Decimal
from django.db import transaction
from rest_framework import serializers
from backend.invoices.models import Invoice
from security.data_immutability import validate_payment_not_overpaid
from security.input_validation import validate_positive_amount
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    customer_name = serializers.CharField(source='invoice.customer.name', read_only=True)
    recorded_by_username = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'invoice', 'invoice_number', 'customer_name',
            'amount', 'payment_date', 'payment_method',
            'transaction_reference', 'notes', 'recorded_by_username',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def validate_amount(self, value):
        return validate_positive_amount(value, field_name="Payment amount")

    def validate(self, attrs):
        invoice = attrs.get('invoice')
        amount = attrs.get('amount')

        if invoice.status == 'VOID':
            raise serializers.ValidationError({"invoice": "Cannot record payments against a voided invoice."})

        if invoice.status == 'DRAFT':
            raise serializers.ValidationError({"invoice": "Invoice must be finalized and issued before payments can be recorded."})

        if invoice.status == 'PAID' or invoice.balance_remaining <= Decimal('0.00'):
            raise serializers.ValidationError({"invoice": f"Invoice {invoice.invoice_number} is already fully paid."})

        # Strict overpayment protection rule
        validate_payment_not_overpaid(invoice, amount)
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        if user and user.is_authenticated:
            validated_data['recorded_by'] = user

        with transaction.atomic():
            payment = Payment.objects.create(**validated_data)
            invoice = Invoice.objects.select_for_update().get(id=payment.invoice_id)
            
            # Recalculate invoice payments and status
            total_paid = sum(p.amount for p in invoice.payments.all())
            invoice.paid_amount = total_paid
            invoice.balance_remaining = max(Decimal('0.00'), invoice.total_amount - total_paid)
            invoice.save(update_fields=['paid_amount', 'balance_remaining', 'updated_at'])
            invoice.update_financial_status(save=True)

        return payment
