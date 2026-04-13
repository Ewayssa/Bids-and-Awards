from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.http import FileResponse, HttpResponse, JsonResponse
import mimetypes

from ..models import User, Document, Report, CalendarEvent, Notification, AuditLog
from ..serializers import (
    UserSerializer,
    RegisterSerializer,
    DocumentSerializer,
    ReportSerializer,
    CalendarEventSerializer,
    NotificationSerializer,
    AuditLogSerializer,
)
from ..services.dashboard_service import DashboardService
from ..services.backup_service import BackupService
from ..constants import DEFAULT_USER_PASSWORD
from ..utils.document_helpers import get_next_transaction_number

# --- Helper Functions ---

def _create_notification(message, link='/encode', admin_only=False):
    Notification.objects.create(message=message, link=link, admin_only=admin_only)

def _log_audit(action, actor='System', target_type='', target_id='', description=''):
    """Record an important action in the audit trail."""
    AuditLog.objects.create(
        action=action,
        actor=(actor or 'System').strip() or 'System',
        target_type=(target_type or '')[:64],
        target_id=str(target_id)[:64] if target_id else '',
        description=(description or '')[:500],
    )

# --- Authentication Views ---

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
        })
    return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Public self-registration."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    
    _log_audit('user_registered', user.username, 'user', str(user.id), 'New account registered')
    
    from django.utils.timezone import localtime
    time_str = localtime(timezone.now()).strftime('%B %d, %Y, %I:%M %p')
    display_name = (user.fullName or user.username or 'Someone').strip()
    
    _create_notification(
        f'New account created: {display_name} at {time_str}. Activate in User Management.',
        link='/personnel',
        admin_only=True,
    )
    return Response(
        {'message': 'Account created successfully. You can log in once an administrator activates your account.'},
        status=status.HTTP_201_CREATED,
    )

@api_view(['POST'])
def update_profile(request):
    """Allow user to update their own profile."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    
    if not username or not current_password:
        return Response({'detail': 'email and current_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
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

# --- Password Management Views ---

@api_view(['POST'])
def change_password(request):
    """Allow user to set a new password."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not all([username, current_password, new_password]):
        return Response({'detail': 'All password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
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
    identifier = (request.data.get('username') or request.data.get('email') or '').strip()
    if not identifier:
        return Response({'detail': 'Email or username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(username__iexact=identifier).first() or \
           User.objects.filter(email__iexact=identifier).first()
           
    if not user or not user.is_active:
        # Return success even if user doesn't exist for security
        return Response({'message': 'If an account exists, a temporary password will be generated.'})
        
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    user.set_password(temp_password)
    user.must_change_password = True
    user.save(update_fields=['password', 'must_change_password'])
    
    _log_audit('password_reset_request', user.username, 'user', str(user.id), 'Temporary password generated')
    
    # In a real system, send this via email.
    print(f"TEMPORARY PASSWORD for {user.username}: {temp_password}")
    
    return Response({
        'message': 'A temporary password has been generated.',
        'temporary_password': temp_password,  # Including for development/demo ease
        'email_sent': True
    })

# Removed reset_password view as we now use temporary passwords.

# --- ViewSets ---

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer

    @action(detail=False, methods=['get'])
    def bac_members(self, request):
        bac_members = User.objects.filter(position='BAC Member').values('id', 'fullName', 'username')
        return Response(list(bac_members))

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.pop('password', None)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _log_audit('user_created', (request.data.get('created_by') or 'System'), 'user', str(user.id), f'User {user.username} created')
        
        response_data = UserSerializer(user).data
        if hasattr(user, '_temporary_password'):
            response_data['temporary_password'] = user._temporary_password
        return Response(response_data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.save()
        actor = (self.request.data.get('updated_by') or 'System')
        _log_audit('user_updated', actor, 'user', str(instance.id), f'User {instance.username} updated')

    def perform_destroy(self, instance):
        user_id, username = str(instance.id), instance.username
        actor = (self.request.data.get('deleted_by') or 'System')
        super().perform_destroy(instance)
        _log_audit('user_deleted', actor, 'user', user_id, f'User {username} deleted')

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return response

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        username = (request.data.get('currentUsername') or '').strip()
        if not username:
            return Response({'detail': 'User required.'}, status=status.HTTP_403_FORBIDDEN)
        
        user = User.objects.filter(username=username).first()
        if not user:
            return Response({'detail': 'User not found.'}, status=status.HTTP_403_FORBIDDEN)
            
        doc_by = (instance.uploadedBy or '').strip().lower()
        # Admin can always bypass the restriction
        if user.role.lower() != 'admin':
            if doc_by != username.lower() and doc_by != (user.fullName or '').strip().lower():
                return Response({'detail': 'Unauthorized uploader. Only the original uploader or an Admin can edit this document.'}, status=status.HTTP_403_FORBIDDEN)
                
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', doc.uploadedBy or 'Unknown', 'document', str(doc.id), title)
        _create_notification(f'New BAC document submitted: {title}')

    def perform_update(self, serializer):
        old_status = serializer.instance.calculate_status()
        doc = serializer.save()
        doc.refresh_from_db()
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = (self.request.data.get('currentUsername') or doc.uploadedBy or 'Unknown')
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}')
        if doc.status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}')

    def perform_destroy(self, instance):
        doc_id, title = str(instance.id), (instance.title or instance.prNo or 'Document')[:80]
        actor = (self.request.data.get('currentUsername') or instance.uploadedBy or 'Unknown')
        super().perform_destroy(instance)
        _log_audit('document_deleted', actor, 'document', doc_id, title)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-uploaded_at')
    serializer_class = ReportSerializer

    def perform_create(self, serializer):
        report = serializer.save()
        _log_audit('report_created', report.uploadedBy or 'Unknown', 'report', str(report.id), report.title[:80])

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        report = self.get_object()
        if not report.file: return Response({'detail': 'No file.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            content_type, _ = mimetypes.guess_type(report.file.name)
            content_type = content_type or 'application/octet-stream'
            resp = FileResponse(report.file.open('rb'), content_type=content_type)
            resp['Content-Disposition'] = 'inline'
            return resp
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all().order_by('-created_at')
    serializer_class = CalendarEventSerializer

    def perform_create(self, serializer):
        event = serializer.save()
        actor = self.request.data.get('created_by') or 'Unknown'
        _log_audit('calendar_event_created', actor, 'calendar_event', str(event.id), event.title[:80])

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.read = True
        n.save(update_fields=['read'])
        return Response(NotificationSerializer(n).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(read=False).update(read=True)
        return Response({'detail': 'ok'})

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-created_at')
    serializer_class = AuditLogSerializer

# --- Custom Business Logic Views ---

@api_view(['GET'])
def next_transaction_number(request):
    date_param = request.query_params.get('date', '').strip()
    return Response({'next_transaction_number': get_next_transaction_number(date=date_param or None)})

@api_view(['GET'])
def get_dashboard_data(request):
    uploaded_by = request.query_params.get('uploadedBy', '').strip()
    data = DashboardService.get_dashboard_data(uploaded_by=uploaded_by)
    return Response(data, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})

@api_view(['GET'])
def backup_data(request):
    data = BackupService.export_data()
    username = (request.data.get('username') or request.query_params.get('username') or 'System').strip()
    _log_audit('backup_exported', username, 'system', '', 'Data backup exported')
    return JsonResponse(data)

@api_view(['POST'])
def restore_data(request):
    restored = BackupService.restore_data(request.data)
    username = (request.data.get('username') or request.query_params.get('username') or 'System').strip()
    msg = f"Restore: {restored['calendarEvents']} events, {restored['users']} users, {restored['documents']} docs, {restored['reports']} reports"
    _log_audit('restore_completed', username, 'system', '', msg)
    return Response({'detail': 'Restore completed', 'restored': restored})
