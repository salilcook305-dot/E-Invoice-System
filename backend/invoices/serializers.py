from decimal import Decimal
from rest_framework import serializers
from backend.customers.models import Customer
from backend.products.models import Product
from backend.validation.calculator import recalculate_invoice_totals
from security.data_immutability import assert_invoice_is_mutable
from .models import Invoice, InvoiceItem

class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'description', 'quantity', 'unit_price', 'gst_rate',
            'subtotal', 'tax_amount', 'total_amount'
        ]

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_gstin = serializers.CharField(source='customer.gstin', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    invoice_number = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pdf_hash = serializers.CharField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'customer_email', 'customer_gstin',
            'status', 'issue_date', 'due_date',
            'subtotal', 'tax_amount', 'discount_amount', 'total_amount',
            'paid_amount', 'balance_remaining',
            'pdf_hash', 'notes', 'items', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subtotal', 'tax_amount', 'total_amount',
            'paid_amount', 'balance_remaining', 'pdf_hash', 'created_at', 'updated_at'
        ]

    def validate_invoice_number(self, value):
        if value:
            val_clean = value.strip()
            qs = Invoice.objects.filter(invoice_number__iexact=val_clean)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(f"Invoice number '{val_clean}' is already in use. Please enter a different number or leave blank to auto-generate.")
            return val_clean
        return ''

    def validate(self, attrs):
        if self.instance and self.instance.status in ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'):
            raise serializers.ValidationError({"detail": f"Invoice {self.instance.invoice_number} is locked in '{self.instance.status}' state and is immutable. Financial records cannot be altered."})

        issue_date = attrs.get('issue_date') or (self.instance.issue_date if self.instance else None)
        due_date = attrs.get('due_date') or (self.instance.due_date if self.instance else None)
        if issue_date and due_date and due_date < issue_date:
            raise serializers.ValidationError({"due_date": "Due date cannot precede invoice issue date."})
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({"items": "At least one line item is required to create an invoice."})

        # Auto-assign invoice number if not explicitly specified or empty
        inv_number = (validated_data.get('invoice_number') or '').strip()
        if not inv_number:
            validated_data['invoice_number'] = Invoice.generate_unique_number()
        else:
            validated_data['invoice_number'] = inv_number

        user = self.context['request'].user if 'request' in self.context else None
        if user and user.is_authenticated:
            validated_data['created_by'] = user

        invoice = Invoice.objects.create(**validated_data)

        # Create line items
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        recalculate_invoice_totals(invoice, save=True)
        return invoice

    def update(self, instance, validated_data):
        # Enforce immutability
        assert_invoice_is_mutable(instance)

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError({"items": "An invoice cannot have zero line items."})
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        recalculate_invoice_totals(instance, save=True)
        return instance

class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_gstin = serializers.CharField(source='customer.gstin', read_only=True)
    item_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'customer_gstin',
            'status', 'issue_date', 'due_date', 'total_amount', 'paid_amount',
            'balance_remaining', 'pdf_hash', 'item_count', 'created_at'
        ]
