import json
from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete / Soft Delete'),
        ('PAYMENT', 'Payment Recorded'),
        ('ISSUE', 'Invoice Issued & Hashed'),
        ('VOID', 'Invoice Voided'),
        ('EMAIL', 'Invoice Emailed'),
        ('VERIFY', 'Integrity Verified'),
    )

    entity_name = models.CharField(max_length=64)
    entity_id = models.CharField(max_length=64)
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    changes_json = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_entries'
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        username = self.user.username if self.user else 'System'
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {username} {self.action} on {self.entity_name} #{self.entity_id}"

def record_audit_log(entity_name, entity_id, action, user=None, changes=None, request=None):
    """
    Standardized utility to record an immutable audit entry in the database.
    """
    ip_addr = None
    if request:
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded:
            ip_addr = x_forwarded.split(',')[0].strip()
        else:
            ip_addr = request.META.get('REMOTE_ADDR')

    json_payload = None
    if changes is not None:
        try:
            # Handle non-serializable objects (Decimals, dates)
            json_payload = json.dumps(changes, default=str)
        except Exception:
            json_payload = str(changes)

    return AuditLog.objects.create(
        entity_name=entity_name,
        entity_id=str(entity_id),
        action=action,
        changes_json=json_payload,
        ip_address=ip_addr,
        user=user if (user and user.is_authenticated) else None
    )

