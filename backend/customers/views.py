from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from security.role_based_access import IsStaffOrAdmin, IsAdminRole
from backend.audit_log.models import record_audit_log
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_deleted=False)
    serializer_class = CustomerSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        qs = Customer.objects.filter(is_deleted=False)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(gstin__icontains=search) | qs.filter(email__icontains=search)
        return qs.order_by('name')

    def perform_create(self, serializer):
        customer = serializer.save()
        record_audit_log(
            entity_name='Customer',
            entity_id=customer.id,
            action='CREATE',
            user=self.request.user,
            changes={'name': customer.name, 'gstin': customer.gstin, 'email': customer.email},
            request=self.request
        )

    def perform_update(self, serializer):
        customer = serializer.save()
        record_audit_log(
            entity_name='Customer',
            entity_id=customer.id,
            action='UPDATE',
            user=self.request.user,
            changes=serializer.validated_data,
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        # Soft delete instead of hard delete
        customer = self.get_object()
        customer.soft_delete(user=request.user)
        record_audit_log(
            entity_name='Customer',
            entity_id=customer.id,
            action='DELETE',
            user=request.user,
            changes={'soft_deleted': True},
            request=request
        )
        return Response({'status': 'Customer soft-deleted successfully'}, status=status.HTTP_200_OK)

