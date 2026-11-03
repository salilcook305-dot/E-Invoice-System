from rest_framework import serializers
from security.input_validation import validate_positive_amount
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'sku', 'description', 'unit_price',
            'gst_rate', 'hsn_sac_code', 'is_active', 'is_deleted',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']

    def validate_unit_price(self, value):
        return validate_positive_amount(value, field_name="Unit price")

