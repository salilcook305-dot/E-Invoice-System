from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from backend.authentication.views import (
    CustomTokenObtainPairView,
    CurrentUserView,
    UserViewSet,
)
from backend.customers.views import CustomerViewSet
from backend.products.views import ProductViewSet
from backend.invoices.views import InvoiceViewSet
from backend.payments.views import PaymentViewSet
from backend.audit_log.views import AuditLogViewSet
from backend.pdf_generation.views import InvoicePDFView
from backend.email.views import SendInvoiceEmailView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    # Authentication Endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),

    # Dedicated PDF & Email endpoints
    path('invoices/<int:pk>/generate-pdf/', InvoicePDFView.as_view(), name='invoice_generate_pdf'),
    path('invoices/<int:pk>/send-email/', SendInvoiceEmailView.as_view(), name='invoice_send_email'),

    # Router ViewSets
    path('', include(router.urls)),
]

