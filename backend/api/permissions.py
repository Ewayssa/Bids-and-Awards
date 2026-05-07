"""Custom DRF permissions aligned with BAC roles."""

from rest_framework import permissions


class IsBACSecretariat(permissions.BasePermission):
    """Allow access only to users with role 'bac_secretariat' (Admin) or Django superusers."""

    message = 'BAC Secretariat (Admin) access required.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return is_bac_secretariat(user)


class IsBACSecretariatOrReadOnly(permissions.BasePermission):
    """Allow full access for BAC Secretariat, read-only for others."""

    message = 'Only BAC Secretariat can perform this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        if is_bac_secretariat(user):
            return True
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return False


class CanManageUsers(permissions.BasePermission):
    """Allow only BAC Secretariat to manage users."""

    message = 'Only BAC Secretariat can manage users.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return is_bac_secretariat(user)


class CanUploadDocuments(permissions.BasePermission):
    """Allow BAC Secretariat and BAC Chair to upload documents."""

    message = 'You do not have permission to upload documents.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = (getattr(user, 'role', None) or '').strip().lower()
        # BAC Members are explicitly restricted from uploading. 
        # They can only view/download and assign PR numbers.
        return role in ['bac_secretariat', 'bac_chair', 'end_user', 'admin']


class CanEditProcurementRecords(permissions.BasePermission):
    """Allow only BAC Secretariat to edit procurement records."""

    message = 'Only BAC Secretariat can edit procurement records.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return is_bac_secretariat(user)


class CanDeleteRecords(permissions.BasePermission):
    """Allow only BAC Secretariat to delete records."""

    message = 'Only BAC Secretariat can delete records.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return is_bac_secretariat(user)


class CanViewAuditLog(permissions.BasePermission):
    """Allow only BAC Secretariat to view audit logs."""

    message = 'Only BAC Secretariat can view audit logs.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        return is_bac_secretariat(user)


class IsPlanningUnit(permissions.BasePermission):
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'planning_unit'

class IsSupplyOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'supply'

class IsEndUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'end_user'

class IsTWG(permissions.BasePermission):
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'twg'

class IsApprover(permissions.BasePermission):
    def has_permission(self, request, view):
        return get_user_role(request.user) == 'approver'


def get_user_role(user):
    """Get the normalized role of a user."""
    if not user or not user.is_authenticated:
        return None
    return (getattr(user, 'role', None) or '').strip().lower()


def is_bac_secretariat(user):
    """Check if user is BAC Secretariat (Admin)."""
    if getattr(user, 'is_superuser', False):
        return True
    role = get_user_role(user)
    return role in ['bac_secretariat', 'admin'] or getattr(user, 'position', '') == 'BAC Secretariat'


def is_bac_chair(user):
    """Check if user is BAC Chair."""
    return get_user_role(user) == 'bac_chair'


def is_bac_member(user):
    """Check if user is BAC Member."""
    role = get_user_role(user)
    position = getattr(user, 'position', '')
    # Allow variations of the role name (bac_member, bac member, etc.)
    return role in ['bac_member', 'bac member'] or position and 'bac member' in position.lower()

def is_planning_unit(user):
    return get_user_role(user) == 'planning_unit'

def is_supply_officer(user):
    return get_user_role(user) == 'supply' or getattr(user, 'position', '') == 'Supply Officer'

def is_end_user(user):
    return get_user_role(user) == 'end_user'

def is_twg(user):
    return get_user_role(user) == 'twg'

def is_approver(user):
    return get_user_role(user) == 'approver'
