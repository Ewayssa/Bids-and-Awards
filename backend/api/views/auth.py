from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.conf import settings as django_settings

from ..models import User
from ..permissions import is_bac_secretariat, is_bac_chair
from .helpers import _log_audit

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        if not user.is_active:
            return Response(
                {'message': 'Your account is not yet active. An administrator must activate it before you can log in.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        refresh = RefreshToken.for_user(user)
        _log_audit('user_login', user.username, 'user', str(user.id), 'User logged in')
        
        return Response({
            'message': 'Login successful',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
            'role': user.role,
            'fullName': user.fullName or user.username,
            'position': getattr(user, 'position', '') or '',
            'office': user.office or '',
            'must_change_password': getattr(user, 'must_change_password', False),
            'is_bac_secretariat': is_bac_secretariat(user),
            'is_bac_chair': is_bac_chair(user),
        })
    return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_profile(request):
    """Return the currently authenticated user's profile info for session sync."""
    user = request.user
    return Response({
        'username': user.username,
        'role': user.role,
        'fullName': user.fullName or user.username,
        'position': getattr(user, 'position', '') or '',
        'office': user.office or '',
        'is_bac_secretariat': is_bac_secretariat(user),
        'is_bac_chair': is_bac_chair(user),
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Allow user to update their own profile."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    
    if not username or not current_password:
        return Response({'detail': 'email and current_password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.username != username:
        return Response({'detail': 'You can only update your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        
    user = authenticate(username=username, password=current_password)
    if not user:
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        
    fields = ['fullName', 'position', 'office']
    updated_fields = []
    for field in fields:
        val = request.data.get(field)
        if val is not None:
            setattr(user, field, val.strip() or getattr(user, field))
            updated_fields.append(field)
            
    if updated_fields:
        user.save(update_fields=updated_fields)
        
    return Response({
        'id': user.id,
        'username': user.username,
        'fullName': user.fullName or user.username,
        'position': getattr(user, 'position', '') or '',
        'office': user.office or '',
        'role': user.role,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow user to set a new password."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not all([username, current_password, new_password]):
        return Response({'detail': 'All password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.user.username != username:
        return Response({'detail': 'You can only change your own password.'}, status=status.HTTP_403_FORBIDDEN)
        
    user = authenticate(username=username, password=current_password)
    if not user:
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=['password', 'must_change_password'])
    _log_audit('password_changed', user.username, 'user', str(user.id), 'Password changed')
    return Response({'message': 'Password changed successfully.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Generate a temporary password and require change on next login."""
    _forgot_msg = (
        'If an account exists for this identifier, recovery steps allowed by your administrator '
        'have been applied. Contact your administrator if you still cannot log in.'
    )
    identifier = (request.data.get('username') or request.data.get('email') or '').strip()
    if not identifier:
        return Response({'detail': 'Email or username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(username__iexact=identifier).first() or \
           User.objects.filter(email__iexact=identifier).first()
           
    if not user or not user.is_active:
        return Response({'message': _forgot_msg})
        
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    user.set_password(temp_password)
    user.must_change_password = True
    user.save(update_fields=['password', 'must_change_password'])
    
    _log_audit('password_reset_request', user.username, 'user', str(user.id), 'Temporary password generated')

    if django_settings.DEBUG:
        print(f"TEMPORARY PASSWORD for {user.username}: {temp_password}")

    payload = {'message': _forgot_msg}
    if django_settings.DEBUG:
        payload['temporary_password'] = temp_password
    return Response(payload)
