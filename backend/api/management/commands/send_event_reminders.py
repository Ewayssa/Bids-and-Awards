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
        
        tomorrow = timezone.now().date() + timedelta(days=1)
        upcoming_events = CalendarEvent.objects.filter(date=tomorrow, reminder_sent=False)
        
        if not upcoming_events.exists():
            self.stdout.write(self.style.SUCCESS('No upcoming activities requiring reminders found for tomorrow.'))
            return

        for event in upcoming_events:
            self.stdout.write(f'Sending reminder for: {event.title} ({event.date})')

        result = EmailNotificationService.send_due_event_reminders(tomorrow)
        
        self.stdout.write(self.style.SUCCESS(
            f"Finished processing reminders. Sent: {result['sent']}, Errors: {result['errors']}"
        ))
