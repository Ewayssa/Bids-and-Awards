from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
import secrets

from .models import User, Document, Report, CalendarEvent, Notification, PasswordResetToken, AuditLog
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    DocumentSerializer,
    ReportSerializer,
    CalendarEventSerializer,
    NotificationSerializer,
    AuditLogSerializer,
    get_next_transaction_number,
)


@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        if not user.is_active:
            return Response({'message': 'Your account is not yet active. An administrator must activate it before you can log in.'}, status=status.HTTP_403_FORBIDDEN)
        _log_audit('user_login', user.username, 'user', str(user.id), 'User logged in')
        return Response({
            'message': 'Login successful',
            'username': user.username,
            'role': user.role,
            'fullName': user.fullName or user.username,
            'position': getattr(user, 'position', '') or '',
            'office': user.office or '',
            'must_change_password': getattr(user, 'must_change_password', False),
        })
    return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def register(request):
    """Public self-registration. Creates an inactive user; admin is notified and must activate the account."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    _log_audit('user_registered', user.username, 'user', str(user.id), 'New account registered')
    created_at = timezone.now()
    from django.utils.timezone import localtime
    time_str = localtime(created_at).strftime('%B %d, %Y, %I:%M %p')
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
    """Allow any authenticated user (via username + current_password) to update their own fullName, position, office."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    full_name = request.data.get('fullName')
    position = request.data.get('position')
    office = request.data.get('office')
    if not username or not current_password:
        return Response(
            {'detail': 'email and current_password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = authenticate(username=username, password=current_password)
    if not user:
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
    update_fields = []
    if full_name is not None:
        user.fullName = (full_name or '').strip() or user.fullName
        update_fields.append('fullName')
    if position is not None:
        user.position = (position or '').strip()
        update_fields.append('position')
    if office is not None:
        user.office = (office or '').strip()
        update_fields.append('office')
    if update_fields:
        user.save(update_fields=update_fields)
    return Response({
        'id': user.id,
        'username': user.username,
        'fullName': user.fullName or user.username,
        'position': getattr(user, 'position', '') or '',
        'office': user.office or '',
        'role': user.role,
    })


@api_view(['POST'])
def change_password(request):
    """Allow user to set a new password; requires current password. Clears must_change_password."""
    username = request.data.get('username')
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    if not username or not current_password or not new_password:
        return Response(
            {'detail': 'email, current_password, and new_password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = authenticate(username=username, password=current_password)
    if not user:
        return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=['password', 'must_change_password'])
    _log_audit('password_changed', user.username, 'user', str(user.id), 'Password changed')
    return Response({'message': 'Password changed successfully.'})


@api_view(['POST'])
def forgot_password(request):
    """Request a password reset; returns token so user can be redirected to set new password (no email)."""
    identifier = (request.data.get('username') or request.data.get('email') or '').strip()
    if not identifier:
        return Response(
            {'detail': 'Email or username is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    # User management stores the "Email" field as username; try both email and username
    user = User.objects.filter(username__iexact=identifier).first()
    if not user and '@' in identifier:
        user = User.objects.filter(email__iexact=identifier).first()
    if not user or not user.is_active:
        return Response({'detail': 'No active account found with that email or username.'}, status=status.HTTP_404_NOT_FOUND)
    PasswordResetToken.objects.filter(user=user).delete()
    token = secrets.token_urlsafe(32)
    PasswordResetToken.objects.create(user=user, token=token)
    return Response({'message': 'You can now set a new password.', 'token': token})


@api_view(['POST'])
def reset_password(request):
    """Set a new password using a valid reset token. Notifies admin after successful reset."""
    token = (request.data.get('token') or '').strip()
    new_password = request.data.get('new_password')
    if not token or not new_password:
        return Response(
            {'detail': 'Token and new_password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        reset = PasswordResetToken.objects.get(token=token)
    except PasswordResetToken.DoesNotExist:
        return Response({'detail': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)
    expiry = timezone.now() - timedelta(hours=1)
    if reset.created_at < expiry:
        reset.delete()
        return Response({'detail': 'Reset link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
    user = reset.user
    if not user.is_active:
        reset.delete()
        return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
    if len(new_password) < 8:
        return Response({'detail': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=['password', 'must_change_password'])
    reset.delete()
    _log_audit('password_reset', user.username, 'user', str(user.id), 'Password reset via token')
    display_name = (user.fullName or user.username or user.email or 'A user').strip()
    _create_notification(f'{display_name} reset their password.', link='/personnel', admin_only=True)
    return Response({'message': 'Password reset successfully. You can now log in.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        # Auto-generate password for new users; do not require or use password from request
        data = request.data.copy()
        if 'password' in data:
            data.pop('password')
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        _log_audit('user_created', (request.data.get('created_by') or 'System').strip(), 'user', str(user.id), f'User {user.username} created')
        response_data = UserSerializer(user).data
        temporary_password = getattr(user, '_temporary_password', None)
        if temporary_password is not None:
            response_data['temporary_password'] = temporary_password
        return Response(response_data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.instance
        serializer.save()
        actor = (self.request.data.get('updated_by') or 'System').strip()
        _log_audit('user_updated', actor, 'user', str(instance.id), f'User {instance.username} updated')

    def perform_destroy(self, instance):
        user_id = str(instance.id)
        username = instance.username
        actor = (self.request.data.get('deleted_by') or 'System').strip()
        super().perform_destroy(instance)
        _log_audit('user_deleted', actor, 'user', user_id, f'User {username} deleted')


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


@api_view(['GET'])
def next_transaction_number(request):
    """Return BAC Folder No. for the given date (query param date=YYYY-MM-DD). Uses today if date omitted."""
    date_param = request.query_params.get('date', '').strip()
    if date_param:
        return Response({'next_transaction_number': get_next_transaction_number(date=date_param)})
    return Response({'next_transaction_number': get_next_transaction_number()})


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    pagination_class = None  # Return all documents so Manage Documents and list show every file (no page 1 only)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        """Return document list with real-time status; prevent caching so counts stay accurate."""
        response = super().list(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return response

    def partial_update(self, request, *args, **kwargs):
        """Only the user who uploaded the document can update it."""
        instance = self.get_object()
        current_username = (request.data.get('currentUsername') or '').strip()
        if not current_username:
            return Response(
                {'detail': 'Current user is required to update a document.'},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            current_user = User.objects.get(username=current_username)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid user.'},
                status=status.HTTP_403_FORBIDDEN
            )
        doc_uploaded_by = (instance.uploadedBy or '').strip()
        user_full_name = (current_user.fullName or '').strip()
        user_username = (current_user.username or '').strip()
        if not doc_uploaded_by:
            return Response(
                {'detail': 'Document has no uploader.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Match case-insensitively so "John Doe" / "john doe" and spacing don't block the real uploader
        doc_by_lower = doc_uploaded_by.lower()
        if doc_by_lower != (user_full_name or '').lower() and doc_by_lower != (user_username or '').lower():
            return Response(
                {'detail': 'Only the user who uploaded this document can update it.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', (doc.uploadedBy or 'Unknown').strip(), 'document', str(doc.id), title)
        _create_notification(f'New BAC document submitted: {title}')

    def perform_update(self, serializer):
        old_status = serializer.instance.calculate_status()
        doc = serializer.save()
        doc.refresh_from_db()
        new_status = doc.status
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = (self.request.data.get('currentUsername') or doc.uploadedBy or 'Unknown').strip()
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}')
        if new_status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}')

    def perform_destroy(self, instance):
        doc_id = str(instance.id)
        title = (instance.title or instance.prNo or 'Document')[:80]
        actor = (self.request.data.get('currentUsername') or instance.uploadedBy or 'Unknown').strip()
        super().perform_destroy(instance)
        _log_audit('document_deleted', actor, 'document', doc_id, title)


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-uploaded_at')
    serializer_class = ReportSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        report = serializer.save()
        _log_audit('report_created', (report.uploadedBy or 'Unknown').strip(), 'report', str(report.id), (report.title or 'Report')[:80])

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        report_id = str(instance.id)
        title = (instance.title or 'Report')[:80]
        actor = (self.request.data.get('currentUsername') or instance.uploadedBy or 'Unknown').strip()
        super().perform_destroy(instance)
        _log_audit('report_deleted', actor, 'report', report_id, title)


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all().order_by('-created_at')
    serializer_class = CalendarEventSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError:
            raise
        except Exception as e:
            detail = str(e)
            if hasattr(e, 'detail') and isinstance(getattr(e, 'detail', None), (list, dict)):
                return Response({'detail': e.detail}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {'detail': detail or 'Failed to create calendar event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)


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
    """Read-only list of audit trail entries (important actions only)."""
    queryset = AuditLog.objects.all().order_by('-created_at')
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        return AuditLog.objects.all().order_by('-created_at')


# Document types and required sub-documents (must match frontend DOC_TYPES)
CHECKLIST_DOC_TYPES = [
    ('Initial Documents', ['Purchase Request', 'Activity Design', 'Project Procurement Management Plan/Supplemental PPMP', 'Annual Procurement Plan', 'Market Scopping', 'Requisition and Issue Slip']),
    ('RFQ Concerns', [
        'PHILGEPS - List of Venue',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding',
        'Certificate of DILG - List of Venue',
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - Public Bidding',
    ]),
    ('BAC Meeting Documents', ['Certificate of BAC', 'Invitation to COA', 'Attendance Sheet', 'Minutes of the Meeting']),
    ('Award Documents', ['BAC Resolution', 'Abstract of Quotation', 'Lease of Venue: Table Rating Factor', 'Notice of Award', 'Contract Services/Purchase Order', 'Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"]),
    ('Award Posting', ['PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award', 'Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)']),
]


def _document_status_counts(docs_qs):
    """
    Count documents by real-time status (calculate_status per document).
    Returns counts that match what the Encode page shows: total, completed, ongoing, pending.
    For existing document records, status is always 'complete' or 'ongoing'; pending = 0.
    """
    completed = ongoing = pending = 0
    for doc in docs_qs:
        s = (doc.calculate_status() or '').lower().strip() or 'ongoing'
        if s == 'complete':
            completed += 1
        elif s == 'pending':
            pending += 1
        else:
            ongoing += 1
    total = completed + ongoing + pending
    return {'total': total, 'completed': completed, 'ongoing': ongoing, 'pending': pending}


def _checklist_counts(docs_qs):
    """
    Compute checklist counts to match Encode page Update modal checklist.
    One row per (category, subDoc) from CHECKLIST_DOC_TYPES — same 25-slot checklist.
    Pending = no document for that slot. Ongoing = slot has doc(s) but none complete. Completed = at least one doc is complete.
    For each slot, if ANY matching document is complete, count the slot as completed (not ongoing).
    """
    docs = list(docs_qs)
    completed = ongoing = pending = 0
    for category, sub_docs in CHECKLIST_DOC_TYPES:
        cat_trim = (category or '').strip()
        for sub_doc in sub_docs:
            sub_trim = (sub_doc or '').strip()
            matches = [
                d for d in docs
                if (d.category or '').strip() == cat_trim and (d.subDoc or '').strip() == sub_trim
            ]
            if not matches:
                pending += 1  # No document — "Not yet submitted"
            else:
                # If any document for this slot is complete, count slot as completed
                any_complete = any(
                    (m.calculate_status() or '').lower().strip() == 'complete'
                    for m in matches
                )
                if any_complete:
                    completed += 1
                else:
                    ongoing += 1  # Has doc(s) but none complete
    total = completed + ongoing + pending
    return {'total': total, 'completed': completed, 'ongoing': ongoing, 'pending': pending}


@api_view(['GET'])
def get_dashboard_data(request):
    from django.utils import timezone
    from datetime import timedelta

    # Optional: filter by uploader so employees see only their own documents
    uploaded_by = request.query_params.get('uploadedBy', '').strip()
    docs_qs = Document.objects.all().order_by('-uploaded_at')
    if uploaded_by:
        docs_qs = docs_qs.filter(uploadedBy=uploaded_by)

    # Checklist counts: total=25 slots, completed/ongoing/pending by slot (pending = slots with no document yet)
    checklist = _checklist_counts(docs_qs)
    pie_data = [checklist['total'], checklist['completed'], checklist['ongoing'], checklist['pending']]
    total_documents_uploaded = docs_qs.count()

    # Counts for RFQ procurement methods (List of Venue, Small Value Procurement, Public Bidding)
    def _count_subdoc(docs, pattern):
        if pattern == 'List of Venue':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'List of Venue' or ((d.subDoc or '').strip().endswith(' - List of Venue')))
        if pattern == 'Small Value Procurement':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'Small Value Procurement' or ((d.subDoc or '').strip().endswith(' - Small Value Procurement')))
        if pattern == 'Public Bidding':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'Public Bidding' or ((d.subDoc or '').strip().endswith(' - Public Bidding')))
        return 0

    docs_list = list(docs_qs)
    procurement_method_counts = {
        'List of Venue': _count_subdoc(docs_list, 'List of Venue'),
        'Small Value Procurement': _count_subdoc(docs_list, 'Small Value Procurement'),
        'Public Bidding': _count_subdoc(docs_list, 'Public Bidding'),
    }

    today = timezone.now().date()
    start_date = today - timedelta(days=365)
    end_date = today + timedelta(days=365)
    calendar_events_qs = CalendarEvent.objects.filter(
        date__gte=start_date, date__lte=end_date
    ).order_by('date')
    calendar_events = [
        {'id': str(e.id), 'title': e.title, 'date': e.date.isoformat()}
        for e in calendar_events_qs
    ]

    # Last 5 submitted BAC documents (for dashboard recent submissions)
    recent_docs_qs = Document.objects.all().order_by('-uploaded_at')
    if uploaded_by:
        recent_docs_qs = recent_docs_qs.filter(uploadedBy=uploaded_by)
    recent_submissions = [
        {
            'id': str(d.id),
            'title': d.title or '—',
            'category': d.category or '—',
            'status': d.calculate_status(),
            'date_submitted': d.uploaded_at.isoformat() if d.uploaded_at else None,
            'prNo': d.prNo or '—',
        }
        for d in recent_docs_qs[:5]
    ]

    # Last 5 activities (from notifications)
    recent_activity = [
        {'message': n.message, 'created_at': n.created_at.isoformat(), 'id': str(n.id)}
        for n in Notification.objects.all().order_by('-created_at')[:5]
    ]

    return Response(
        {
            'pieData': pie_data,
            'totalDocumentsUploaded': total_documents_uploaded,
            'procurementMethodCounts': procurement_method_counts,
            'calendarEvents': calendar_events,
            'recentSubmissions': recent_submissions,
            'recentActivity': recent_activity,
        },
        headers={'Cache-Control': 'no-store, no-cache, must-revalidate'}
    )


@api_view(['GET'])
def backup_data(request):
    """
    Export a complete records backup as JSON: calendar events, users (no passwords),
    and full document/report metadata (all form fields). Actual uploaded files (PDFs)
    are not included—they remain on the server in media/. Use this backup to restore
    event lists, user roles/status, and document/report metadata on the same server.
    For full disaster recovery, also back up the database and the media folder.
    """
    from django.http import JsonResponse
    from decimal import Decimal

    def _serialize_doc(d):
        """Export all document fields except the file binary; include file path for reference."""
        out = {'id': str(d.id)}
        # All model fields except 'file' (we store file name for reference only)
        for f in ['prNo', 'title', 'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type',
                  'certified_true_copy', 'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to',
                  'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3',
                  'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 'resolution_no',
                  'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 'abstract_bidders', 'table_rating_service_provider',
                  'table_rating_address', 'table_rating_factor_value', 'notice_award_service_provider', 'notice_award_authorized_rep',
                  'notice_award_conforme', 'contract_received_by_coa', 'contract_amount', 'notarized_place', 'notarized_date',
                  'ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep',
                  'secretary_service_provider', 'secretary_owner_rep', 'uploadedBy', 'category', 'subDoc', 'status']:
            val = getattr(d, f, None)
            if val is None:
                out[f] = None
            elif isinstance(val, (str, bool)):
                out[f] = val
            elif hasattr(val, 'isoformat'):
                out[f] = val.isoformat() if val else None
            elif isinstance(val, Decimal):
                out[f] = str(val)
            else:
                out[f] = val
        out['uploaded_at'] = d.uploaded_at.isoformat() if d.uploaded_at else None
        out['updated_at'] = d.updated_at.isoformat() if d.updated_at else None
        out['file_name'] = d.file.name if d.file else None
        return out

    def _serialize_report(r):
        out = {'id': str(r.id), 'title': r.title, 'submitting_office': r.submitting_office or '',
               'uploadedBy': r.uploadedBy or '', 'file_name': r.file.name if r.file else None}
        out['uploaded_at'] = r.uploaded_at.isoformat() if r.uploaded_at else None
        return out

    events = [
        {'id': str(e.id), 'title': e.title, 'date': e.date.isoformat()}
        for e in CalendarEvent.objects.all().order_by('-created_at')
    ]
    users = [
        {'id': u.id, 'username': u.username, 'role': u.role, 'fullName': u.fullName or '', 'position': getattr(u, 'position', '') or '', 'office': u.office or '', 'is_active': u.is_active}
        for u in User.objects.all()
    ]
    docs = [_serialize_doc(d) for d in Document.objects.all().order_by('-uploaded_at')]
    reports = [_serialize_report(r) for r in Report.objects.all().order_by('-uploaded_at')]

    data = {
        'backupVersion': 1,
        'createdAt': timezone.now().isoformat(),
        'description': 'BAC records backup: events, users, document and report metadata (no file contents). Back up server media folder separately for full recovery.',
        'calendarEvents': events,
        'users': users,
        'documents': docs,
        'reports': reports,
    }
    _log_audit('backup_exported', (request.data.get('username') or request.query_params.get('username') or 'System').strip(), 'system', '', 'Data backup exported')
    return JsonResponse(data)


@api_view(['POST'])
def restore_data(request):
    """
    Restore from a records backup JSON:
    - Replaces all calendar events with those in the backup.
    - Updates existing users (is_active, role, fullName, position, office).
    - Updates existing documents with all backed-up metadata (status and all form fields); does not create new documents or replace file uploads.
    - Updates existing reports with backed-up metadata (title, submitting_office, uploadedBy); does not replace file uploads.
    """
    from datetime import datetime
    from decimal import Decimal, InvalidOperation
    try:
        data = request.data
    except Exception:
        return Response({'detail': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)
    restored = {'calendarEvents': 0, 'users': 0, 'documents': 0, 'reports': 0}

    def _parse_date(val):
        if val is None:
            return None
        if hasattr(val, 'year'):
            return val
        if isinstance(val, str) and val.strip():
            try:
                return datetime.strptime(val[:10], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass
        return None

    def _parse_decimal(val):
        if val is None or val == '':
            return None
        if isinstance(val, Decimal):
            return val
        try:
            return Decimal(str(val).replace(',', '').strip())
        except (InvalidOperation, ValueError, TypeError):
            return None

    if 'calendarEvents' in data and isinstance(data['calendarEvents'], list):
        CalendarEvent.objects.all().delete()
        for e in data['calendarEvents']:
            date_val = _parse_date(e.get('date'))
            if not date_val:
                continue
            CalendarEvent.objects.create(title=e.get('title', ''), date=date_val)
            restored['calendarEvents'] += 1

    if 'users' in data and isinstance(data['users'], list):
        for u in data['users']:
            uid = u.get('id')
            if not uid:
                continue
            try:
                user = User.objects.get(pk=uid)
                if 'is_active' in u:
                    user.is_active = bool(u['is_active'])
                if 'role' in u and u['role'] in dict(User.ROLE_CHOICES):
                    user.role = u['role']
                if 'fullName' in u:
                    user.fullName = u['fullName'] or ''
                if 'position' in u:
                    user.position = u.get('position') or ''
                if 'office' in u:
                    user.office = u['office'] or ''
                user.save()
                restored['users'] += 1
            except User.DoesNotExist:
                pass

    # Restore all document metadata for existing documents (by id); do not touch file field
    doc_meta_fields = [
        'title', 'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type',
        'certified_true_copy', 'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to',
        'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3',
        'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 'resolution_no',
        'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 'abstract_bidders', 'table_rating_service_provider',
        'table_rating_address', 'table_rating_factor_value', 'notice_award_service_provider', 'notice_award_authorized_rep',
        'notice_award_conforme', 'contract_received_by_coa', 'contract_amount', 'notarized_place', 'notarized_date',
        'ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep',
        'secretary_service_provider', 'secretary_owner_rep', 'uploadedBy', 'category', 'subDoc', 'status',
    ]
    if 'documents' in data and isinstance(data['documents'], list):
        for d in data['documents']:
            doc_id = d.get('id')
            if not doc_id:
                continue
            try:
                doc = Document.objects.get(pk=doc_id)
                for f in doc_meta_fields:
                    if f not in d:
                        continue
                    val = d[f]
                    if f in ('date', 'date_received', 'notarized_date'):
                        doc.__setattr__(f, _parse_date(val))
                    elif f in ('total_amount', 'market_budget', 'contract_amount'):
                        doc.__setattr__(f, _parse_decimal(val))
                    elif f in ('contract_received_by_coa', 'certified_true_copy'):
                        doc.__setattr__(f, bool(val) if val is not None else False)
                    elif f == 'status':
                        if val in ('pending', 'ongoing', 'complete'):
                            doc.status = val
                    else:
                        doc.__setattr__(f, val if val is not None else '')
                doc.save()
                restored['documents'] += 1
            except (Document.DoesNotExist, ValueError):
                pass

    if 'reports' in data and isinstance(data['reports'], list):
        for r in data['reports']:
            rid = r.get('id')
            if not rid:
                continue
            try:
                report = Report.objects.get(pk=rid)
                if 'title' in r:
                    report.title = r['title'] or report.title
                if 'submitting_office' in r:
                    report.submitting_office = r['submitting_office'] or ''
                if 'uploadedBy' in r:
                    report.uploadedBy = r['uploadedBy'] or ''
                report.save()
                restored['reports'] += 1
            except (Report.DoesNotExist, ValueError):
                pass

    _log_audit('restore_completed', (request.data.get('username') or request.query_params.get('username') or 'System').strip(), 'system', '', f"Restore completed: {restored['calendarEvents']} events, {restored['users']} users, {restored['documents']} documents, {restored['reports']} reports")
    return Response({'detail': 'Restore completed', 'restored': restored})
