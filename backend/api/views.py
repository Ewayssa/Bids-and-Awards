from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate
from .models import User, Document, Report, CalendarEvent, Notification
from .serializers import UserSerializer, DocumentSerializer, ReportSerializer, CalendarEventSerializer, NotificationSerializer


@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user:
        if not user.is_active:
            return Response({'message': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            'message': 'Login successful',
            'role': user.role,
            'fullName': user.fullName or user.username,
            'position': getattr(user, 'position', '') or '',
            'office': user.office or '',
            'must_change_password': getattr(user, 'must_change_password', False),
        })
    return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


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
    return Response({'message': 'Password changed successfully.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        # Auto-generate password for new users; do not require or use password from request
        data = request.data.copy()
        if 'password' in data:
            data.pop('password')
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_data = UserSerializer(user).data
        temporary_password = getattr(user, '_temporary_password', None)
        if temporary_password is not None:
            response_data['temporary_password'] = temporary_password
        return Response(response_data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)


def _create_notification(message, link='/encode'):
    Notification.objects.create(message=message, link=link)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

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
        if doc_uploaded_by != user_full_name and doc_uploaded_by != user_username:
            return Response(
                {'detail': 'Only the user who uploaded this document can update it.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _create_notification(f'New BAC document submitted: {title}')

    def perform_update(self, serializer):
        old_status = serializer.instance.calculate_status()
        doc = serializer.save()
        doc.refresh_from_db()
        new_status = doc.status
        title = (doc.title or doc.prNo or 'Document')[:80]
        _create_notification(f'BAC document updated: {title}')
        if new_status == 'complete' and old_status != 'complete':
            _create_notification(f'BAC document completed: {title}')

    def perform_destroy(self, instance):
        super().perform_destroy(instance)


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-uploaded_at')
    serializer_class = ReportSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)


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


# Document types and required sub-documents (must match frontend DOC_TYPES)
CHECKLIST_DOC_TYPES = [
    ('Initial Documents', ['Purchase Request', 'Activity Design', 'Project Procurement Management Plan/Supplemental PPMP', 'Annual Procurement Plan', 'Market Scopping', 'Requisition and Issue Slip']),
    ('AFQ Concerns', ['PhilGEPS Posting for RFQ', 'Certificate of DILG R1 Website and Conspicuous for RFQ']),
    ('BAC Meeting Documents', ['Certificate of BAC', 'Invitation to COA', 'Attendance Sheet', 'Minutes of the Meeting']),
    ('Award Documents', ['BAC Resolution', 'Abstract of Quotation', 'Lease of Venue: Table Rating Factor', 'Notice of Award', 'Contract Services/Purchase Order', 'Notice to Proceed', 'OSS', "Applicable: Secretary's Certificate and Special Power of Attorney"]),
    ('Award Posting', ['PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award', 'Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)']),
]


def _checklist_counts(docs_qs):
    """
    Compute checklist counts to match Encode page Update modal checklist.
    One row per (category, subDoc) from CHECKLIST_DOC_TYPES — same 25-slot checklist.
    Pending = no document for that slot (no check mark). Ongoing = doc exists but incomplete.
    """
    docs = list(docs_qs)
    completed = ongoing = pending = 0
    for category, sub_docs in CHECKLIST_DOC_TYPES:
        cat_trim = (category or '').strip()
        for sub_doc in sub_docs:
            sub_trim = (sub_doc or '').strip()
            match = next(
                (d for d in docs
                 if (d.category or '').strip() == cat_trim and (d.subDoc or '').strip() == sub_trim),
                None
            )
            if not match:
                pending += 1  # No document — "Not yet submitted" (no check mark)
            else:
                s = (match.calculate_status() or '').lower().strip() or 'pending'
                if s == 'complete':
                    completed += 1  # Check mark
                else:
                    ongoing += 1  # Document exists but incomplete (no check mark)
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

    # Use checklist counts: pending = slots with no document uploaded
    checklist = _checklist_counts(docs_qs)
    pie_data = [checklist['total'], checklist['completed'], checklist['ongoing'], checklist['pending']]
    total_documents_uploaded = docs_qs.count()  # Actual count of documents in the system

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
            'calendarEvents': calendar_events,
            'recentSubmissions': recent_submissions,
            'recentActivity': recent_activity,
        },
        headers={'Cache-Control': 'no-store, no-cache, must-revalidate'}
    )


@api_view(['GET'])
def backup_data(request):
    """Export calendar events, users (no passwords), documents and reports metadata as JSON."""
    from django.http import JsonResponse
    events = [
        {'id': str(e.id), 'title': e.title, 'date': e.date.isoformat()}
        for e in CalendarEvent.objects.all().order_by('-created_at')
    ]
    users = [
        {'id': u.id, 'username': u.username, 'role': u.role, 'fullName': u.fullName or '', 'position': getattr(u, 'position', '') or '', 'office': u.office or '', 'is_active': u.is_active}
        for u in User.objects.all()
    ]
    docs = [
        {'id': str(d.id), 'title': d.title, 'prNo': d.prNo, 'date': d.date.isoformat() if d.date else None,
         'category': d.category, 'subDoc': d.subDoc, 'uploadedBy': d.uploadedBy, 'status': d.status,
         'uploaded_at': d.uploaded_at.isoformat() if d.uploaded_at else None}
        for d in Document.objects.all().order_by('-uploaded_at')
    ]
    reports = [
        {'id': str(r.id), 'title': r.title, 'submitting_office': r.submitting_office,
         'uploadedBy': r.uploadedBy, 'uploaded_at': r.uploaded_at.isoformat() if r.uploaded_at else None}
        for r in Report.objects.all().order_by('-uploaded_at')
    ]
    data = {'calendarEvents': events, 'users': users, 'documents': docs, 'reports': reports}
    return JsonResponse(data)


@api_view(['POST'])
def restore_data(request):
    """Restore calendar events, user status (is_active, role, etc), and document status from JSON."""
    from datetime import datetime
    try:
        data = request.data
    except Exception:
        return Response({'detail': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)
    restored = {'calendarEvents': 0, 'users': 0, 'documents': 0}
    if 'calendarEvents' in data and isinstance(data['calendarEvents'], list):
        CalendarEvent.objects.all().delete()
        for e in data['calendarEvents']:
            date_val = e.get('date')
            if isinstance(date_val, str):
                try:
                    date_val = datetime.strptime(date_val[:10], '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    continue
            if not date_val:
                continue
            CalendarEvent.objects.create(
                title=e.get('title', ''),
                date=date_val
            )
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
                if 'role' in u:
                    role_val = u['role']
                    # Validate role is a valid choice
                    if role_val in dict(User.ROLE_CHOICES):
                        user.role = role_val
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
    if 'documents' in data and isinstance(data['documents'], list):
        for d in data['documents']:
            doc_id = d.get('id')
            if not doc_id:
                continue
            try:
                doc = Document.objects.get(pk=doc_id)
                if 'status' in d and d['status'] in ('pending', 'ongoing', 'complete'):
                    doc.status = d['status']
                    doc.save()
                    restored['documents'] += 1
            except (Document.DoesNotExist, ValueError):
                pass
    return Response({'detail': 'Restore completed', 'restored': restored})
