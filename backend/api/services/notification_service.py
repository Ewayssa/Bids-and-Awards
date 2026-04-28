import logging
from datetime import timedelta

from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailNotificationService:
    @staticmethod
    def _calendar_recipients():
        """Return all system users with usable email addresses."""
        from api.models import User

        return list(
            User.objects
            .filter(email__isnull=False)
            .exclude(email='')
            .values_list('email', flat=True)
        )

    @staticmethod
    def _event_time_display(event):
        start_time = getattr(event, 'start_time', None)
        end_time = getattr(event, 'end_time', None)
        if not start_time:
            return None

        time_display = start_time.strftime('%I:%M %p')
        if end_time:
            time_display += f" - {end_time.strftime('%I:%M %p')}"
        return time_display

    @staticmethod
    def _send_html_email(subject, recipients, template_name, context):
        """Helper to send HTML emails with plain text fallback."""
        if not recipients:
            logger.warning(f'No recipients for email: {subject}')
            return False
            
        try:
            # Add common context
            context['login_url'] = f"{settings.FRONTEND_BASE_URL}/login"
            context['frontend_base_url'] = settings.FRONTEND_BASE_URL
            
            html_message = render_to_string(template_name, context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipients,
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f'Successfully sent "{subject}" email to {len(recipients)} users')
            return True
        except Exception as e:
            logger.error(f'Failed to send email "{subject}": {e}')
            return False

    @classmethod
    def send_calendar_event_notification(cls, event):
        """Send notification when a calendar event is newly created."""
        recipients = cls._calendar_recipients()
        
        context = {
            'notification_type': 'Notice of Scheduled Activity',
            'intro_text': 'This serves as an official notice that a new activity has been scheduled in the BAC Calendar. Please find the formal details below:',
            'event': event,
            'time_display': cls._event_time_display(event),
        }
        
        return cls._send_html_email(
            subject=f'OFFICIAL NOTICE: New BAC Activity - {event.title}',
            recipients=recipients,
            template_name='calendar_event_email.html',
            context=context
        )

    @classmethod
    def send_upcoming_reminder(cls, event):
        """Send reminder for an upcoming calendar event."""
        recipients = cls._calendar_recipients()
        
        context = {
            'notification_type': 'Official Reminder of Activity',
            'greeting': 'To all concerned personnel,',
            'intro_text': 'This is an official reminder regarding the following BAC activity scheduled for tomorrow:',
            'event': event,
            'time_display': cls._event_time_display(event),
        }
        
        return cls._send_html_email(
            subject=f'REMINDER: Scheduled BAC Activity - {event.title}',
            recipients=recipients,
            template_name='calendar_event_email.html',
            context=context
        )

    @classmethod
    def send_due_event_reminders(cls, reminder_date=None):
        """
        Send one-day email reminders for events on reminder_date.

        Defaults to tomorrow and marks each event once the email send succeeds.
        """
        from api.models import CalendarEvent

        reminder_date = reminder_date or (timezone.now().date() + timedelta(days=1))
        sent_count = 0
        error_count = 0

        events = CalendarEvent.objects.filter(date=reminder_date, reminder_sent=False)
        for event in events:
            try:
                if cls.send_upcoming_reminder(event):
                    event.reminder_sent = True
                    event.save(update_fields=['reminder_sent'])
                    sent_count += 1
                else:
                    error_count += 1
            except Exception as exc:
                logger.error(f'Error sending reminder for "{event.title}": {exc}')
                error_count += 1

        return {
            'sent': sent_count,
            'errors': error_count,
            'date': reminder_date,
        }
