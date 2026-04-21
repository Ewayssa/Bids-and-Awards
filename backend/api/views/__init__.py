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
import mimetypes

from ..models import User, Document, Report, CalendarEvent, Notification, AuditLog, ProcurementRecord, ProcurementStageStatus
from ..permissions import (
    IsBACSecretariat, 
    IsBACSecretariatOrReadOnly, 
    CanManageUsers,
    CanEditProcurementRecords,
    CanDeleteRecords,
    CanViewAuditLog,
    is_bac_secretariat,
    is_bac_chair,
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
    ProcurementStageStatusSerializer,
)
from ..services.dashboard_service import DashboardService
from ..utils.workflow_logic import is_stage_ready_to_advance
from ..models import AuditLog
import logging
from ..constants import DEFAULT_USER_PASSWORD
from ..utils.document_helpers import get_next_transaction_number

# --- Helper Functions ---

def _create_notification(message, link='/procurement', admin_only=False):
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
            'is_bac_secretariat': is_bac_secretariat(user),
            'is_bac_chair': is_bac_chair(user),
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
        'have been applied. Contact your administrator if you still cannot sign in.'
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

# Removed reset_password view as we now use temporary passwords.

# --- ViewSets ---

class ProcurementRecordViewSet(viewsets.ModelViewSet):
    queryset = ProcurementRecord.objects.all().order_by('-created_at')
    serializer_class = ProcurementRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.query_params.get('status', '').strip()
        if status:
            queryset = queryset.filter(status=status)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['created_by'] = request.user.fullName or request.user.username
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        _log_audit('procurement_record_created', request.user.username, 'procurement_record', str(record.id), f'{record.pr_no} - {record.title}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_audit('procurement_record_updated', self.request.user.username, 'procurement_record', str(instance.id), f'{instance.pr_no} - {instance.title}')

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        record = self.get_object()
        docs = record.documents.all()
        
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
        new_status = record.calculate_status()
        if record.status != new_status:
            record.status = new_status
            record.save(update_fields=['status', 'updated_at'])
        return Response({'status': new_status})

    @action(detail=True, methods=['post'])
    def next_stage(self, request, pk=None):
        record = self.get_object()
        
        # Validation: Check if the current stage is complete
        ready, missing = is_stage_ready_to_advance(record)
        if not ready and not is_bac_secretariat(request.user): # Allow admin to bypass?
            return Response({
                'error': f'Cannot advance stage. Missing required documents: {", ".join(missing)}',
                'missing': missing
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if record.current_stage < 12:
            record.current_stage += 1
            # Update status based on the new stage
            stage_status_map = {
                2: 'preparing',
                3: 'under_review',
                4: 'approved', # or for_revision
                5: 'for_input',
                6: 'for_posting',
                7: 'for_float',
                8: 'for_schedule',
                9: 'under_evaluation',
                10: 'for_award',
                11: 'awarded',
                12: 'for_liquidation'
            }
            new_status = stage_status_map.get(record.current_stage)
            if new_status:
                record.status = new_status
            record.save(update_fields=['current_stage', 'status', 'updated_at'])
            _log_audit('stage_advanced', request.user.username, 'procurement_record', str(record.id), f'{record.pr_no} moved to stage {record.current_stage}')
        return Response(ProcurementRecordSerializer(record).data)

    @action(detail=True, methods=['post'])
    def set_stage(self, request, pk=None):
        record = self.get_object()
        stage = request.data.get('stage')
        status_val = request.data.get('status')
        if stage is not None:
            record.current_stage = int(stage)
        if status_val:
            record.status = status_val
        record.save()
        _log_audit('stage_set', request.user.username, 'procurement_record', str(record.id), f'{record.pr_no} set to stage {record.current_stage}, status {record.status}')
        return Response(ProcurementRecordSerializer(record).data)


class ProcurementStageStatusViewSet(viewsets.ModelViewSet):
    queryset = ProcurementStageStatus.objects.all()
    serializer_class = ProcurementStageStatusSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save()
        _log_audit('stage_status_updated', self.request.user.username, 'stage_status', str(instance.id), 
                   f'Stage {instance.stage_number} for {instance.procurement_record.pr_no} - Completed: {instance.is_completed}')


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
        
        # Filtering by category
        category = self.request.query_params.get('category', '').strip()
        if category:
            queryset = queryset.filter(category__icontains=category)
            
        # Filtering by subDoc (specific document type)
        sub_doc = self.request.query_params.get('subDoc', '').strip()
        if sub_doc:
            queryset = queryset.filter(subDoc__icontains=sub_doc)
            
        # Filtering by PPMP No (for linking APPs/PRs)
        ppmp_no = self.request.query_params.get('ppmp_no', '').strip()
        if ppmp_no:
            queryset = queryset.filter(ppmp_no=ppmp_no)
            
        # Filtering by prNo (BAC Folder)
        pr_no = self.request.query_params.get('prNo', '').strip()
        if pr_no:
            queryset = queryset.filter(prNo=pr_no)

        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action in ['create']:
            return [IsAuthenticated()]
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
        # Auto-assign uploadedBy from current user if not provided
        if not serializer.validated_data.get('uploadedBy'):
            serializer.validated_data['uploadedBy'] = self.request.user.fullName or self.request.user.username
        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', doc.uploadedBy or 'Unknown', 'document', str(doc.id), title)
        _create_notification(f'New BAC document submitted: {title}', admin_only=False)

    def perform_update(self, serializer):
        old_status = serializer.instance.calculate_status()
        doc = serializer.save()
        doc.refresh_from_db()
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = self.request.user.username
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}', admin_only=True)
        if doc.status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}', admin_only=True)

    @action(detail=True, methods=['post'])
    def assign_pr_no(self, request, pk=None):
        """
        Custom action to assign a PR # to a document and automatically 
        initialize/link the BAC Folder (ProcurementRecord).
        Triggered from the PR list page.
        """
        doc = self.get_object()
        user_pr_no = request.data.get('user_pr_no', '').strip()
        
        if not user_pr_no:
            return Response({'error': 'PR Number is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        with transaction.atomic():
            # 1. Update the PR document metadata
            doc.user_pr_no = user_pr_no
            doc.save(update_fields=['user_pr_no'])
            
            # 2. Find or Create the ProcurementRecord (Folder)
            ppmp_no = doc.ppmp_no
            record = None
            if ppmp_no:
                record = ProcurementRecord.objects.filter(ppmp_no=ppmp_no).first()
            
            if not record:
                # Use helper to generate sequential BAC Folder ID
                from ..utils.document_helpers import get_next_transaction_number
                pr_no = get_next_transaction_number()
                
                record = ProcurementRecord.objects.create(
                    pr_no=pr_no,
                    ppmp_no=ppmp_no,
                    title=doc.title,
                    user_pr_no=user_pr_no,
                    year=doc.year,
                    quarter=doc.quarter,
                    total_amount=doc.total_amount,
                    source_of_fund=doc.source_of_fund,
                    created_by=request.user.fullName or request.user.username
                )
                _log_audit('procurement_record_auto_created', request.user.username, 'procurement_record', str(record.id), f'Auto-created folder {record.pr_no} via PR {user_pr_no}')
            else:
                # If folder exists but PR No was not yet assigned to the folder itself
                if not record.user_pr_no:
                    record.user_pr_no = user_pr_no
                    record.save(update_fields=['user_pr_no'])

            # 3. Link context: Find all documents sharing this PPMP No and link them to the folder
            if ppmp_no:
                # Update both newly and previously orphan documents
                affected = Document.objects.filter(
                    ppmp_no=ppmp_no, 
                    procurement_record__isnull=True
                ).update(procurement_record=record, prNo=record.pr_no)
            
            # Ensure the triggering document is explicitly linked
            if doc.procurement_record != record:
                 doc.procurement_record = record
                 doc.prNo = record.pr_no
                 doc.save(update_fields=['procurement_record', 'prNo'])

        return Response(DocumentSerializer(doc).data)

    def perform_destroy(self, instance):
        doc_id, title = str(instance.id), (instance.title or instance.prNo or 'Document')[:80]
        actor = self.request.user.username
        super().perform_destroy(instance)
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

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        report = self.get_object()
        if not report.file: return Response({'detail': 'No file.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            # NOTE: For production, it's more efficient to offload file serving to a web server
            # like Nginx using X-Accel-Redirect. This Django view is suitable for development.
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

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Calendar event create error: {e}')
            raise

    def perform_create(self, serializer):
        event = serializer.save()
        actor = self.request.data.get('created_by') or 'Unknown'
        _log_audit('calendar_event_created', actor, 'calendar_event', str(event.id), event.title[:80])
        date_str = event.date.strftime('%b %d, %Y') if event.date else ''
        title_short = (event.title or 'Activity')[:200]
        _create_notification(
            f'BAC activity scheduled: {title_short} — {date_str}',
            link='/',
            admin_only=True,
        )
        try:
            from .services.notification_service import EmailNotificationService
            EmailNotificationService.send_calendar_event_notification(event)
        except Exception as email_err:
            import logging
            logging.getLogger(__name__).error(f'Email notification failed: {email_err}')

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer

    def _ensure_upcoming_calendar_notifications(self):
        """
        Create user-facing reminders for calendar events occurring tomorrow.
        Also triggers email reminders if not already sent.

        This runs opportunistically during `get_queryset()` (idempotent via message match for system notifications
        and via reminder_sent field for emails).
        """
        today = timezone.now().date()
        reminder_date = today + timedelta(days=1)
        reminder_date_str = reminder_date.strftime('%b %d, %Y')

        events = CalendarEvent.objects.filter(date=reminder_date)
        for e in events:
            # 1. System notification
            title_short = (e.title or 'Activity')[:200]
            msg = f'Incoming BAC activity: {title_short} — {reminder_date_str}'
            if not Notification.objects.filter(message=msg, admin_only=False).exists():
                _create_notification(msg, link='/', admin_only=False)
            
            # 2. Email notification (if not already sent by management command or previous run)
            if not e.reminder_sent:
                try:
                    from ..services.notification_service import EmailNotificationService
                    if EmailNotificationService.send_upcoming_reminder(e):
                        e.reminder_sent = True
                        e.save(update_fields=['reminder_sent'])
                except Exception as err:
                    import logging
                    logging.getLogger(__name__).error(f'Opportunistic email reminder failed for "{e.title}": {err}')

    def get_queryset(self):
        qs = Notification.objects.all().order_by('-created_at')
        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()
        is_admin = is_bac_secretariat(user)
        if not is_admin:
            self._ensure_upcoming_calendar_notifications()
            qs = qs.filter(admin_only=False)
        return qs

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

# --- Custom Business Logic Views ---

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


