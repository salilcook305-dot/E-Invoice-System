from rest_framework import serializers
from security.input_validation import validate_gstin, validate_pan, validate_phone
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'gstin', 'pan',
            'billing_address', 'shipping_address', 'is_deleted',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']

    def validate_gstin(self, value):
        if value:
            return validate_gstin(value)
        return value

    def validate_pan(self, value):
        if value:
            return validate_pan(value)
        return value

    def validate_phone(self, value):
        if value:
            return validate_phone(value)
        return value

