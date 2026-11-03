from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from security.role_based_access import IsStaffOrAdmin, IsAdminRole
from backend.audit_log.models import record_audit_log
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_deleted=False)
    serializer_class = ProductSerializer
    permission_classes = [IsStaffOrAdmin]

    def get_queryset(self):
        qs = Product.objects.filter(is_deleted=False)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(sku__icontains=search)
        active_only = self.request.query_params.get('active_only')
        if active_only in ('true', '1'):
            qs = qs.filter(is_active=True)
        return qs.order_by('name')

    def perform_create(self, serializer):
        product = serializer.save()
        record_audit_log(
            entity_name='Product',
            entity_id=product.id,
            action='CREATE',
            user=self.request.user,
            changes={'name': product.name, 'sku': product.sku, 'unit_price': str(product.unit_price)},
            request=self.request
        )

    def perform_update(self, serializer):
        product = serializer.save()
        record_audit_log(
            entity_name='Product',
            entity_id=product.id,
            action='UPDATE',
            user=self.request.user,
            changes=serializer.validated_data,
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_deleted = True
        product.save(update_fields=['is_deleted'])
        record_audit_log(
            entity_name='Product',
            entity_id=product.id,
            action='DELETE',
            user=request.user,
            changes={'soft_deleted': True},
            request=request
        )
        return Response({'status': 'Product soft-deleted successfully'}, status=status.HTTP_200_OK)

