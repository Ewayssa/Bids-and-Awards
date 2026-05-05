from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q

from ..models import CalendarEvent, Notification, AuditLog
from ..serializers import CalendarEventSerializer, NotificationSerializer, AuditLogSerializer
from ..permissions import IsBACSecretariat, is_bac_secretariat, is_bac_member
from ..services.notification_service import EmailNotificationService
from .helpers import _log_audit, _create_notification

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
        
        is_privileged = is_bac_secretariat(user) or is_bac_member(user)
        
        query = Q(recipient=user) | Q(recipient_role=user.role)
        query |= Q(recipient__isnull=True, recipient_role__isnull=True, admin_only=False)
        
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
