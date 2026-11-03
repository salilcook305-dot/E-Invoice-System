from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='System')
    user_role = serializers.CharField(source='user.role', read_only=True, default='SYSTEM')

    class Meta:
        model = AuditLog
        fields = [
            'id', 'entity_name', 'entity_id', 'action',
            'changes_json', 'ip_address', 'username', 'user_role', 'timestamp'
        ]
        read_only_fields = fields

