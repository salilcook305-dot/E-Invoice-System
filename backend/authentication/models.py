from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default='STAFF')
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=64, blank=True, null=True)

    @property
    def is_admin_user(self):
        return self.is_superuser or self.role == 'ADMIN'

    @property
    def is_staff_user(self):
        return self.role in ('STAFF', 'ADMIN')

    def __str__(self):
        return f"{self.username} ({self.role})"

