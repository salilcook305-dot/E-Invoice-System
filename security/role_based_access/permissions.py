from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminRole(BasePermission):
    """
    Allows access only to users with role 'ADMIN' or Django superusers/staff.
    """
    message = "Admin privileges required to perform this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_superuser or getattr(request.user, 'role', '') == 'ADMIN'

class IsStaffOrAdmin(BasePermission):
    """
    Allows access to authenticated users having role 'STAFF' or 'ADMIN'.
    """
    message = "You must be authenticated as Staff or Admin."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = getattr(request.user, 'role', 'STAFF')
        return request.user.is_superuser or role in ('STAFF', 'ADMIN')

class IsAdminOrReadOnly(BasePermission):
    """
    SAFE_METHODS (GET, HEAD, OPTIONS) allowed for any authenticated user.
    Modifications require ADMIN role.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_superuser or getattr(request.user, 'role', '') == 'ADMIN'

class CanVoidInvoice(BasePermission):
    """
    Only Administrators can void or soft-delete finalized invoices.
    """
    message = "Only administrators are permitted to void or cancel an issued invoice."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_superuser or getattr(request.user, 'role', '') == 'ADMIN'

