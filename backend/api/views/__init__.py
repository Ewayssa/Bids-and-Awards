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
    CanEditProcurementRecords,
    CanDeleteRecords,
    CanViewAuditLog,
    is_bac_secretariat,
    is_bac_chair,
    is_bac_member,
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

def _create_notification(message, link='/procurement', admin_only=False):
    Notification.objects.create(message=message, link=link, admin_only=admin_only)

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
            
        ppmp_no = self.request.query_params.get('ppmp_no', '').strip()
        if ppmp_no:
            queryset = queryset.filter(ppmp_no=ppmp_no)
            
        pr_no = self.request.query_params.get('prNo', '').strip()
        if pr_no:
            queryset = queryset.filter(prNo=pr_no)
        return queryset

    def create(self, request, *args, **kwargs):
        subDoc = request.data.get('subDoc', '').strip()
        ppmp_no = request.data.get('ppmp_no', '').strip()
        user_pr_no = request.data.get('user_pr_no', '').strip()

        if 'Project Procurement Management Plan' in subDoc and ppmp_no:
            if Document.objects.filter(subDoc=subDoc, ppmp_no=ppmp_no).exists():
                return Response({'error': f'A PPMP with No. "{ppmp_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if subDoc == 'Purchase Request' and user_pr_no:
            if Document.objects.filter(subDoc=subDoc, user_pr_no=user_pr_no).exists() or \
               ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists():
                return Response({'error': f'PR No. "{user_pr_no}" is already used by another record.'}, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action in ['preview']:
            return [AllowAny()]
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
        if not serializer.validated_data.get('uploadedBy'):
            serializer.validated_data['uploadedBy'] = self.request.user.fullName or self.request.user.username
        
        doc = serializer.save()
        ppmp_no = doc.ppmp_no
        if ppmp_no:
            from django.db import transaction
            with transaction.atomic():
                record = ProcurementRecord.objects.filter(ppmp_no=ppmp_no).first()
                if not record:
                    pr_no = get_next_transaction_number()
                    record = ProcurementRecord.objects.create(
                        pr_no=pr_no,
                        ppmp_no=ppmp_no,
                        title=doc.title,
                        year=doc.year,
                        quarter=doc.quarter,
                        total_amount=getattr(doc, 'total_amount', None),
                        source_of_fund=getattr(doc, 'source_of_fund', ''),
                        created_by=doc.uploadedBy
                    )
                    _log_audit('procurement_record_auto_created', doc.uploadedBy, 'procurement_record', str(record.id), f'Auto-created folder {record.pr_no} via {doc.subDoc} {ppmp_no}')
                
                doc.procurement_record = record
                doc.prNo = record.pr_no
                if doc.user_pr_no and not record.user_pr_no:
                    record.user_pr_no = doc.user_pr_no
                    record.save(update_fields=['user_pr_no'])
                
                doc.save(update_fields=['procurement_record', 'prNo'])
                
                Document.objects.filter(
                    ppmp_no=ppmp_no, 
                    procurement_record__isnull=True
                ).update(procurement_record=record, prNo=record.pr_no)

                sync_procurement_completion(record)

        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', doc.uploadedBy or 'Unknown', 'document', str(doc.id), title)
        _create_notification(f'New BAC document submitted: {title}', admin_only=False)
        if doc.procurement_record:
            sync_procurement_completion(doc.procurement_record)

    def perform_update(self, serializer):
        from ..utils.document_status import DocumentStatusCalculator
        old_status = DocumentStatusCalculator.calculate_status(serializer.instance)
        doc = serializer.save()
        doc.refresh_from_db()
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = self.request.user.username
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}', admin_only=True)
        if doc.status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}', admin_only=True)

        if doc.procurement_record:
            sync_procurement_completion(doc.procurement_record)

    @action(detail=True, methods=['post'])
    def assign_pr_no(self, request, pk=None):
        doc = self.get_object()
        if not is_bac_member(request.user):
             return Response({'error': 'Only BAC Members are authorized to assign PR numbers.'}, status=status.HTTP_403_FORBIDDEN)
        user_pr_no = request.data.get('user_pr_no', '').strip()
        if not user_pr_no:
            return Response({'error': 'PR Number is required'}, status=status.HTTP_400_BAD_REQUEST)
        if doc.user_pr_no:
            return Response({'error': 'PR No. is already assigned and cannot be updated.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_record = doc.procurement_record
        if not existing_record and doc.ppmp_no:
            existing_record = ProcurementRecord.objects.filter(ppmp_no=doc.ppmp_no).first()

        if existing_record and existing_record.user_pr_no:
            return Response({'error': 'PR No. is already assigned to this procurement record and cannot be updated.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists() or \
           Document.objects.filter(user_pr_no=user_pr_no).exclude(id=doc.id).exists():
            return Response({'error': f'PR No. "{user_pr_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        with transaction.atomic():
            doc.user_pr_no = user_pr_no
            doc.save(update_fields=['user_pr_no'])
            ppmp_no = doc.ppmp_no
            record = None
            if ppmp_no:
                record = ProcurementRecord.objects.filter(ppmp_no=ppmp_no).first()
            if not record:
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
            else:
                if not record.user_pr_no:
                    record.user_pr_no = user_pr_no
                    record.save(update_fields=['user_pr_no'])

            if ppmp_no:
                Document.objects.filter(
                    ppmp_no=ppmp_no, 
                    procurement_record__isnull=True
                ).update(procurement_record=record, prNo=record.pr_no)
            
            if doc.procurement_record != record:
                 doc.procurement_record = record
                 doc.prNo = record.pr_no
                 doc.save(update_fields=['procurement_record', 'prNo'])
            sync_procurement_completion(record)

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
        record = instance.procurement_record
        super().perform_destroy(instance)
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
            admin_only=True,
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
            if not Notification.objects.filter(message=msg, admin_only=False).exists():
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
        qs = Notification.objects.all().order_by('-created_at')
        user = self.request.user
        if not user.is_authenticated:
            return Notification.objects.none()
        
        is_privileged = is_bac_secretariat(user) or is_bac_member(user)
        if not is_privileged:
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
        qs = super().get_queryset()

        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)

        ppmp_id = self.request.query_params.get('ppmp_id')
        if ppmp_id:
            qs = qs.filter(ppmp_id=ppmp_id)
        return qs

    def perform_create(self, serializer):
        pr = serializer.save(created_by=self.request.user.fullName or self.request.user.username)
        _log_audit('purchase_request_created', self.request.user.username, 'purchase_request', str(pr.id), f'PR for {pr.purpose[:50]}')

    def perform_update(self, serializer):
        if 'pr_no' in self.request.data:
            user = self.request.user
            if not is_bac_member(user):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only BAC Members are authorized to assign PR numbers.")
        pr = serializer.save()
        _log_audit('purchase_request_updated', self.request.user.username, 'purchase_request', str(pr.id), f'Updated PR {pr.pr_no}')

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
        _create_notification(f'New Purchase Order generated: {po.po_no}', admin_only=True)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_supply_dashboard_data(request):
    ready_for_po_count = PurchaseRequest.objects.filter(status='approved').count()
    pending_po_count = PurchaseRequest.objects.filter(status='pending').count()
    po_generated_count = PurchaseOrder.objects.count()
    recent_ready_prs = PurchaseRequest.objects.filter(status='approved').order_by('-created_at')[:5]
    pr_serializer = PurchaseRequestSerializer(recent_ready_prs, many=True)
    recent_pos = PurchaseOrder.objects.all().order_by('-created_at')[:5]
    po_serializer = PurchaseOrderSerializer(recent_pos, many=True)
    return Response({
        'stats': {
            'ready_for_po': ready_for_po_count,
            'pending_po': pending_po_count,
            'po_generated': po_generated_count
        },
        'recent_ready_prs': pr_serializer.data,
        'recent_pos': po_serializer.data
    })
