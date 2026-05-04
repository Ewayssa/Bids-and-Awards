from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from django.http import FileResponse, HttpResponse, JsonResponse
from django.conf import settings as django_settings
from django.utils.http import content_disposition_header
import mimetypes
import os

from ..models import User, Document, Report, CalendarEvent, Notification, AuditLog, ProcurementRecord, PurchaseOrder, PurchaseRequest, PurchaseRequestItem
from ..permissions import (
    IsBACSecretariat, 
    IsBACSecretariatOrReadOnly, 
    CanManageUsers,
    CanUploadDocuments,
    CanEditProcurementRecords,
    CanDeleteRecords,
    CanViewAuditLog,
    is_bac_secretariat,
    is_bac_chair,
    is_bac_member,
    is_end_user,
)
from ..serializers import (
    UserSerializer,
    RegisterSerializer,
    DocumentSerializer,
    ReportSerializer,
    CalendarEventSerializer,
    NotificationSerializer,
    AuditLogSerializer,
    ProcurementRecordSerializer,
    PurchaseOrderSerializer,
    PurchaseRequestSerializer,
)
from ..services.dashboard_service import DashboardService
from ..services.notification_service import EmailNotificationService
from ..utils.workflow_logic import get_missing_required_files, sync_procurement_completion
from ..models import AuditLog
import logging
from ..constants import DEFAULT_USER_PASSWORD
from ..utils.document_helpers import get_next_transaction_number

# --- Helper Functions ---

def _create_notification(message, link='/procurement', recipient_role=None, recipient=None, admin_only=False):
    """
    Create an in-system notification.
    If recipient_role is set, all users with that role will see it.
    If recipient is set, only that specific user will see it.
    """
    Notification.objects.create(
        message=message, 
        link=link, 
        recipient_role=recipient_role, 
        recipient=recipient,
        admin_only=admin_only
    )

def _inline_file_response(file_field):
    """
    Return an inline file preview response while preserving the uploaded filename.
    Browsers commonly use the Content-Disposition filename as the preview tab title.
    """
    content_type, _ = mimetypes.guess_type(file_field.name)
    content_type = content_type or 'application/octet-stream'
    filename = os.path.basename(file_field.name)

    response = HttpResponse(file_field.read(), content_type=content_type)
    response['Content-Disposition'] = content_disposition_header(
        as_attachment=False,
        filename=filename,
    )
    response['X-Content-Type-Options'] = 'nosniff'
    return response

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

# --- Password Management Views ---

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

# --- ViewSets ---

class ProcurementRecordViewSet(viewsets.ModelViewSet):
    queryset = ProcurementRecord.objects.all().order_by('-created_at')
    serializer_class = ProcurementRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status', '').strip()
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Uniqueness check for PPMP No
        ppmp_no = data.get('ppmp_no', '').strip()
        if ppmp_no and ProcurementRecord.objects.filter(ppmp_no=ppmp_no).exists():
            return Response({'error': f'A procurement record with PPMP No. "{ppmp_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Uniqueness check for PR No (User-assigned)
        user_pr_no = data.get('user_pr_no', '').strip()
        if user_pr_no and ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists():
            return Response({'error': f'PR No. "{user_pr_no}" is already assigned to another record.'}, status=status.HTTP_400_BAD_REQUEST)

        data['created_by'] = request.user.fullName or request.user.username
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        _log_audit('procurement_record_created', request.user.username, 'procurement_record', str(record.id), f'{record.pr_no} - {record.title}')
        
        # Notify BAC Secretariat/Admin about new Procurement Folder (PR)
        _create_notification(
            f"New Procurement Folder created: {record.pr_no} - {record.title}",
            link='/procurement',
            recipient_role='bac_secretariat'
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_audit('procurement_record_updated', self.request.user.username, 'procurement_record', str(instance.id), f'{instance.pr_no} - {instance.title}')

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        record = self.get_object()
        docs = Document.objects.filter(prNo=record.pr_no)

        stage = request.query_params.get('stage', '').strip()
        if stage:
            stage_config = {
                'initial': ['Initial Documents'],
                'pre_procurement': ['Pre-Procurement'],
                'rfq': ['RFQ Concerns'],
                'bac_meeting': ['BAC Meeting Documents'],
                'award': ['Award Documents'],
                'posting': ['Award Posting'],
                'post_award': ['Post-Award'],
            }
            categories = stage_config.get(stage, [])
            if categories:
                from django.db.models import Q
                q = Q()
                for cat in categories:
                    q |= Q(category__icontains=cat)
                docs = docs.filter(q)

        return Response(DocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['post'])
    def recalculate_status(self, request, pk=None):
        record = self.get_object()
        sync_procurement_completion(record)
        record.refresh_from_db()
        return Response({
            'status': record.status,
            'missing': get_missing_required_files(record),
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'bac_members':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsBACSecretariat()]

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Document.objects.all().order_by('-uploaded_at')

        category = self.request.query_params.get('category', '').strip()
        if category:
            queryset = queryset.filter(category__icontains=category)

        sub_doc = self.request.query_params.get('subDoc', '').strip()
        if sub_doc:
            queryset = queryset.filter(subDoc__icontains=sub_doc)

        pr_no = self.request.query_params.get('prNo', '').strip()
        if pr_no:
            queryset = queryset.filter(prNo=pr_no)
        return queryset

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action in ['preview']:
            return [AllowAny()]
        elif self.action in ['create']:
            return [IsAuthenticated(), CanUploadDocuments()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsBACSecretariat()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return response

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_bac_secretariat(user):
            return Response(
                {'detail': 'Only BAC Secretariat can edit documents.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_bac_secretariat(user):
            return Response(
                {'detail': 'Only BAC Secretariat can delete documents.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        if not serializer.validated_data.get('uploadedBy'):
            serializer.validated_data['uploadedBy'] = self.request.user.fullName or self.request.user.username

        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', doc.uploadedBy or 'Unknown', 'document', str(doc.id), title)

        if 'Project Procurement Management Plan' in doc.subDoc:
            _create_notification(f'New PPMP submitted: {title}', link='/encode', recipient_role='bac_secretariat')
        elif 'Annual Procurement Plan' in doc.subDoc:
            _create_notification(f'New APP submitted: {title}', link='/encode', recipient_role='bac_secretariat')
        else:
            _create_notification(f'New BAC document submitted: {title}', recipient_role='bac_secretariat')

        # Sync procurement folder status if a folder exists for this prNo
        if doc.prNo:
            record = ProcurementRecord.objects.filter(pr_no=doc.prNo).first()
            if record:
                sync_procurement_completion(record)

    def perform_update(self, serializer):
        from ..utils.document_status import DocumentStatusCalculator
        old_status = DocumentStatusCalculator.calculate_status(serializer.instance)
        doc = serializer.save()
        doc.refresh_from_db()
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = self.request.user.username
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}', recipient_role='bac_secretariat')
        if doc.status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}', admin_only=True)
            
        # Sync procurement folder status if a folder exists for this prNo
        if doc.prNo:
            record = ProcurementRecord.objects.filter(pr_no=doc.prNo).first()
            if record:
                sync_procurement_completion(record)


    @action(detail=True, methods=['post'])
    def assign_pr_no(self, request, pk=None):
        """Assign an official PR number to the procurement record linked by this document's prNo."""
        doc = self.get_object()
        if not is_bac_member(request.user):
            return Response({'error': 'Only BAC Members are authorized to assign PR numbers.'}, status=status.HTTP_403_FORBIDDEN)

        user_pr_no = request.data.get('user_pr_no', '').strip()
        if not user_pr_no:
            return Response({'error': 'PR Number is required'}, status=status.HTTP_400_BAD_REQUEST)

        if ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists():
            return Response({'error': f'PR No. "{user_pr_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the procurement record linked by prNo
        record = ProcurementRecord.objects.filter(pr_no=doc.prNo).first() if doc.prNo else None
        if record and record.user_pr_no:
            return Response({'error': 'PR No. is already assigned to this procurement record and cannot be updated.'}, status=status.HTTP_400_BAD_REQUEST)

        if record:
            record.user_pr_no = user_pr_no
            record.save(update_fields=['user_pr_no'])
            from ..utils.workflow_logic import check_folder_readiness
            check_folder_readiness(record)
            sync_procurement_completion(record)

        # Notify the end user (uploader) about the PR assignment
        uploader_name = doc.uploadedBy
        if uploader_name:
            from ..models import User
            uploader = User.objects.filter(username=uploader_name).first() or \
                       User.objects.filter(fullName=uploader_name).first()
            if uploader:
                _create_notification(
                    f"Official PR No. '{user_pr_no}' has been assigned to your request: {doc.title or doc.subDoc}",
                    link='/my-documents',
                    recipient=uploader
                )

        return Response(DocumentSerializer(doc).data)

    @action(detail=True, methods=['get'], url_path='preview', permission_classes=[AllowAny])
    def preview(self, request, pk=None):
        doc = self.get_object()
        if not doc.file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return _inline_file_response(doc.file)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        doc_id, title = str(instance.id), (instance.title or instance.prNo or 'Document')[:80]
        actor = self.request.user.username
        pr_no = instance.prNo
        super().perform_destroy(instance)
        if pr_no:
            record = ProcurementRecord.objects.filter(pr_no=pr_no).first()
            if record:
                sync_procurement_completion(record)
        _log_audit('document_deleted', actor, 'document', doc_id, title)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-uploaded_at')
    serializer_class = ReportSerializer

    def perform_create(self, serializer):
        report = serializer.save()
        if not report.title:
            report.title = report.file.name if report.file else 'Untitled Report'
            report.save()
        _log_audit('report_created', report.uploadedBy or 'Unknown', 'report', str(report.id), report.title[:80])

    @action(detail=True, methods=['get'], url_path='preview', permission_classes=[AllowAny])
    def preview(self, request, pk=None):
        report = self.get_object()
        if not report.file: return Response({'detail': 'No file.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return _inline_file_response(report.file)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all().order_by('-created_at')
    serializer_class = CalendarEventSerializer

    def perform_create(self, serializer):
        event = serializer.save()
        actor = self.request.data.get('created_by') or 'Unknown'
        _log_audit('calendar_event_created', actor, 'calendar_event', str(event.id), event.title[:80])
        date_str = event.date.strftime('%b %d, %Y') if event.date else ''
        title_short = (event.title or 'Activity')[:200]
        _create_notification(
            f'BAC activity scheduled: {title_short} — {date_str}',
            link='/',
            recipient_role='bac_secretariat',
        )
        _create_notification(
            f'BAC activity scheduled: {title_short} — {date_str}',
            link='/',
            recipient_role='bac_member',
        )
        try:
            EmailNotificationService.send_calendar_event_notification(event)
        except Exception as email_err:
            import logging
            logging.getLogger(__name__).error(f'Email notification failed: {email_err}')

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer

    def _ensure_upcoming_calendar_notifications(self):
        today = timezone.now().date()
        reminder_date = today + timedelta(days=1)
        reminder_date_str = reminder_date.strftime('%b %d, %Y')
        events = CalendarEvent.objects.filter(date=reminder_date)
        for e in events:
            title_short = (e.title or 'Activity')[:200]
            msg = f'Incoming BAC activity: {title_short} — {reminder_date_str}'
            if not Notification.objects.filter(message=msg, recipient_role='bac_secretariat').exists():
                _create_notification(msg, link='/', recipient_role='bac_secretariat')
            if not Notification.objects.filter(message=msg, recipient_role='bac_member').exists():
                _create_notification(msg, link='/', recipient_role='bac_member')
            # Standard notification for others (non-admin)
            if not Notification.objects.filter(message=msg, recipient_role__isnull=True, recipient__isnull=True, admin_only=False).exists():
                _create_notification(msg, link='/', admin_only=False)
            if not e.reminder_sent:
                try:
                    if EmailNotificationService.send_upcoming_reminder(e):
                        e.reminder_sent = True
                        e.save(update_fields=['reminder_sent'])
                except Exception as err:
                    import logging
                    logging.getLogger(__name__).error(f'Opportunistic email reminder failed for "{e.title}": {err}')

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()

        self._ensure_upcoming_calendar_notifications()
        
        from django.db.models import Q
        # 1. Notifications targeted to the user's specific role
        # 2. Notifications targeted specifically to this user
        # 3. Global notifications (no role, no recipient)
        # 4. (Legacy) admin_only notifications for privileged users
        
        is_privileged = is_bac_secretariat(user) or is_bac_member(user)
        
        query = Q(recipient=user) | Q(recipient_role=user.role)
        
        # Add global notifications
        query |= Q(recipient__isnull=True, recipient_role__isnull=True, admin_only=False)
        
        # Add legacy admin_only for privileged users
        if is_privileged:
            query |= Q(admin_only=True)
            
        return Notification.objects.filter(query).distinct().order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.read = True
        n.save(update_fields=['read'])
        return Response(NotificationSerializer(n).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(read=False).update(read=True)
        return Response({'detail': 'ok'})

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsBACSecretariat]

@api_view(['GET'])
def next_transaction_number(request):
    date_param = request.query_params.get('date', '').strip()
    return Response({'next_transaction_number': get_next_transaction_number(date=date_param or None)})

@api_view(['GET'])
def get_dashboard_data(request):
    uploaded_by = request.query_params.get('uploadedBy', '').strip()
    user = request.user
    is_admin = is_bac_secretariat(user)
    data = DashboardService.get_dashboard_data(uploaded_by=uploaded_by, is_admin=is_admin)
    data['user_role'] = user.role
    data['is_bac_secretariat'] = is_admin
    data['is_bac_chair'] = is_bac_chair(user)
    return Response(data, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})

class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.all().order_by('-created_at')
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        role = (getattr(user, 'role', None) or '').strip().lower()

        if role in ('bac_secretariat', 'bac_chair', 'admin'):
            # BAC staff see all PRs
            pass
        elif role == 'bac_member':
            # BAC members only see completed PRs
            qs = qs.filter(status='completed')
        elif role == 'supply':
            # Supply Officer only sees completed PRs with an assigned PR No.
            qs = qs.filter(status='completed').exclude(pr_no='').exclude(pr_no__isnull=True)
        else:
            # End Users only see their own PRs
            qs = qs.filter(created_by=user.fullName or user.username)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        ppmp_id = self.request.query_params.get('ppmp_id')
        if ppmp_id:
            qs = qs.filter(ppmp_id=ppmp_id)
        return qs

    def perform_create(self, serializer):
        pr = serializer.save(created_by=self.request.user.fullName or self.request.user.username)
        _log_audit('purchase_request_created', self.request.user.username, 'purchase_request', str(pr.id), f'PR for {pr.purpose[:50]}')
        
        # Ensure status is synced if linked to a folder
        if pr.ppmp:
            from ..utils.workflow_logic import sync_procurement_completion
            sync_procurement_completion(pr.ppmp)

    def perform_update(self, serializer):
        if 'pr_no' in self.request.data:
            user = self.request.user
            if not is_bac_member(user):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only BAC Members are authorized to assign PR numbers.")
        pr = serializer.save()
        _log_audit('purchase_request_updated', self.request.user.username, 'purchase_request', str(pr.id), f'Updated PR {pr.pr_no}')
        
        # Re-sync status after update (this will flip status to 'completed' if pr_no + is_ready)
        if pr.ppmp:
            from ..utils.workflow_logic import sync_procurement_completion
            sync_procurement_completion(pr.ppmp)

        # Notify Supply Officer if a PR number was just assigned
        if 'pr_no' in self.request.data and pr.pr_no:
            _create_notification(
                f"Purchase Request '{pr.purpose[:60]}' has been assigned PR No. {pr.pr_no} and is now ready for Purchase Order generation.",
                link='/supply/generate-po',
                recipient_role='supply',
            )

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        po = serializer.save(created_by=self.request.user.fullName or self.request.user.username)
        if po.purchase_request:
            pr = po.purchase_request
            pr.status = 'po_generated'
            pr.save(update_fields=['status'])
        _log_audit('purchase_order_generated', self.request.user.username, 'purchase_order', str(po.id), f'PO {po.po_no}')
        _create_notification(f'New Purchase Order generated: {po.po_no}', recipient_role='bac_secretariat')

    @action(detail=False, methods=['get'])
    def next_sequence(self, request):
        year = request.query_params.get('year')
        if not year:
            year = timezone.now().year
        
        # Fetch all PO numbers for the given year to find the true maximum sequence
        pos = PurchaseOrder.objects.filter(po_date__year=year).values_list('po_no', flat=True)
        
        max_seq = 0
        for po_no in pos:
            try:
                # Expecting format YYYY-MM-SEQ (e.g. 2026-04-001)
                parts = po_no.split('-')
                if len(parts) >= 3:
                    seq = int(parts[-1])
                    if seq > max_seq:
                        max_seq = seq
            except (ValueError, IndexError):
                continue
        
        return Response({'next_sequence': max_seq + 1})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_supply_dashboard_data(request):
    # Only PRs that are 'completed' AND have an official PR number assigned by BAC
    ready_prs_qs = PurchaseRequest.objects.filter(status='completed').exclude(ppmp__user_pr_no='').exclude(ppmp__user_pr_no__isnull=True)
    
    ready_for_po_count = ready_prs_qs.count()
    pending_po_count = PurchaseRequest.objects.filter(status='ongoing').count()
    po_generated_count = PurchaseOrder.objects.count()
    
    recent_ready_prs = ready_prs_qs.order_by('-created_at')[:5]
    pr_serializer = PurchaseRequestSerializer(recent_ready_prs, many=True)
    recent_pos = PurchaseOrder.objects.all().order_by('-created_at')[:5]
    po_serializer = PurchaseOrderSerializer(recent_pos, many=True)
    print(f"DEBUG: Supply Dashboard - Ready: {ready_for_po_count}, Pending: {pending_po_count}, POs: {po_generated_count}")
    return Response({
        'stats': {
            'ready_for_po': ready_for_po_count,
            'pending_po': pending_po_count,
            'po_generated': po_generated_count
        },
        'recent_ready_prs': pr_serializer.data,
        'recent_pos': po_serializer.data
    }, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})
