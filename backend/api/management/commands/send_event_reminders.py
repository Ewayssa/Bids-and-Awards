from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import CalendarEvent
from api.services.notification_service import EmailNotificationService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sends email reminders for calendar events occurring tomorrow'

    def handle(self, *args, **options):
        self.stdout.write('Checking for upcoming BAC activities...')
        
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        # Find events tomorrow that haven't had a reminder sent yet
        upcoming_events = CalendarEvent.objects.filter(
            date=tomorrow,
            reminder_sent=False
        )
        
        if not upcoming_events.exists():
            self.stdout.write(self.style.SUCCESS('No upcoming activities requiring reminders found for tomorrow.'))
            return

        sent_count = 0
        error_count = 0
        
        for event in upcoming_events:
            self.stdout.write(f'Sending reminder for: {event.title} ({event.date})')
            
            try:
                success = EmailNotificationService.send_upcoming_reminder(event)
                if success:
                    event.reminder_sent = True
                    event.save(update_fields=['reminder_sent'])
                    sent_count += 1
                else:
                    error_count += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Error sending reminder for "{event.title}": {e}'))
                error_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'Finished processing reminders. Sent: {sent_count}, Errors: {error_count}'
        ))
