import logging
import os
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailNotificationService:
    @staticmethod
    def _send_html_email(subject, recipients, template_name, context):
        """Helper to send HTML emails with plain text fallback."""
        if not recipients:
            logger.warning(f'No recipients for email: {subject}')
            return False
            
        try:
            # Add common context
            context['login_url'] = f"{settings.FRONTEND_BASE_URL}/login"
            
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
        from api.models import User
        
        recipients = list(User.objects.filter(email__isnull=False).exclude(email='').values_list('email', flat=True))
        
        # Calculate time display
        time_display = None
        if event.start_time:
            time_display = event.start_time.strftime('%I:%M %p')
            if event.end_time:
                time_display += f" - {event.end_time.strftime('%I:%M %p')}"
        
        context = {
            'notification_type': 'Notice of Scheduled Activity',
            'intro_text': 'This serves as an official notice that a new activity has been scheduled in the BAC Calendar. Please find the formal details below:',
            'event': event,
            'time_display': time_display,
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
        from api.models import User
        
        recipients = list(User.objects.filter(email__isnull=False).exclude(email='').values_list('email', flat=True))
        
        # Calculate time display
        time_display = None
        if event.start_time:
            time_display = event.start_time.strftime('%I:%M %p')
            if event.end_time:
                time_display += f" - {event.end_time.strftime('%I:%M %p')}"
        
        context = {
            'notification_type': 'Official Reminder of Activity',
            'greeting': 'To all concerned personnel,',
            'intro_text': 'This is an official reminder regarding the following BAC activity scheduled for tomorrow:',
            'event': event,
            'time_display': time_display,
        }
        
        return cls._send_html_email(
            subject=f'REMINDER: Scheduled BAC Activity - {event.title}',
            recipients=recipients,
            template_name='calendar_event_email.html',
            context=context
        )