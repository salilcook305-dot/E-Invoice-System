from rest_framework import serializers
from security.jwt_authentication import EISTokenObtainPairSerializer
from .models import User

class CustomTokenObtainPairSerializer(EISTokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': getattr(self.user, 'role', 'STAFF'),
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'is_admin': self.user.is_superuser or getattr(self.user, 'role', '') == 'ADMIN'
        }
        return data

class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source='is_admin_user', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'department', 'is_admin', 'date_joined')
        read_only_fields = ('id', 'date_joined', 'is_admin')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'department')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

