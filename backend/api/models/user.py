from django.contrib.auth.models import AbstractUser, UserManager as AuthUserManager
from django.db import models

class UserManager(AuthUserManager):
    """Custom manager so create_user/create_superuser accept role, fullName, office."""

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(username, email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('bac_secretariat', 'BAC Secretariat'),
        ('bac_member', 'BAC Member'),
        ('supply', 'Supply Officer'),
        ('end_user', 'End User'),
    )
    POSITION_CHOICES = (
        ('BAC Secretariat', 'BAC Secretariat'),
        ('BAC Member', 'BAC Member'),
        ('Supply Officer', 'Supply Officer'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='end_user')
    fullName = models.CharField(max_length=255, blank=True)
    position = models.CharField(
        max_length=255, 
        blank=True, 
        choices=POSITION_CHOICES,
        help_text='Position or designation'
    )
    office = models.CharField(max_length=255, blank=True, help_text='Department')
    must_change_password = models.BooleanField(default=False, help_text='Require user to set a new password on next login')

    objects = UserManager()

    def __str__(self):
        return self.username
