from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class EISTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token generator embedding user role, full name, and permissions into payload.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = getattr(user, 'role', 'STAFF')
        token['full_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
        token['is_admin'] = user.is_staff or (getattr(user, 'role', 'STAFF') == 'ADMIN')
        return token

def create_tokens_for_user(user):
    """
    Programmatic helper to generate JWT access and refresh token dict for a given user.
    """
    refresh = RefreshToken.for_user(user)
    refresh['username'] = user.username
    refresh['email'] = user.email
    refresh['role'] = getattr(user, 'role', 'STAFF')
    refresh['full_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
    refresh['is_admin'] = user.is_staff or (getattr(user, 'role', 'STAFF') == 'ADMIN')
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': getattr(user, 'role', 'STAFF'),
            'first_name': user.first_name,
            'last_name': user.last_name,
        }
    }

