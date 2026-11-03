import re
from decimal import Decimal
from rest_framework.exceptions import ValidationError

GSTIN_REGEX = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
PAN_REGEX = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$')
PHONE_REGEX = re.compile(r'^\+?[0-9\s\-]{8,15}$')

def validate_gstin(value):
    """
    Validates standard Indian 15-character GSTIN format.
    """
    if not value:
        return
    cleaned = value.strip().upper()
    if not GSTIN_REGEX.match(cleaned):
        raise ValidationError(f"Invalid GSTIN format '{value}'. Expected 15-character format like 29ABCDE1234F1Z5.")
    return cleaned

def validate_pan(value):
    """
    Validates standard 10-character PAN format.
    """
    if not value:
        return
    cleaned = value.strip().upper()
    if not PAN_REGEX.match(cleaned):
        raise ValidationError(f"Invalid PAN format '{value}'. Expected 10-character alphanumeric PAN like ABCDE1234F.")
    return cleaned

def validate_phone(value):
    """
    Validates phone number format.
    """
    if not value:
        return
    if not PHONE_REGEX.match(value.strip()):
        raise ValidationError("Invalid phone number. Expected 8 to 15 digits.")
    return value.strip()

def validate_positive_amount(value, field_name="Amount"):
    """
    Validates that a monetary decimal amount is strictly positive.
    """
    try:
        dec = Decimal(str(value))
        if dec <= 0:
            raise ValidationError(f"{field_name} must be strictly greater than 0.")
        return dec
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(f"Invalid number for {field_name}.")

