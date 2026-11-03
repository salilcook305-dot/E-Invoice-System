from rest_framework import viewsets, permissions
from security.role_based_access import IsStaffOrAdmin, IsAdminRole
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for audit trail inspection.
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        qs = AuditLog.objects.all()
        entity = self.request.query_params.get('entity')
        if entity:
            qs = qs.filter(entity_name__iexact=entity)
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action__iexact=action)
        return qs.order_by('-timestamp')

