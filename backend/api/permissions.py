"""Custom DRF permissions aligned with application roles."""

from rest_framework import permissions


class IsAdminRole(permissions.BasePermission):
    """Allow access only to users with role 'admin' or Django superusers."""

    message = 'Admin access required.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        role = (getattr(user, 'role', None) or '').strip().lower()
        return role == 'admin'
