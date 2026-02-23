from django.core.management.base import BaseCommand
from api.models import CalendarEvent


class Command(BaseCommand):
    help = 'Delete CalendarEvent with title "sample2"'

    def handle(self, *args, **options):
        deleted_count, _ = CalendarEvent.objects.filter(title='sample2').delete()
        if deleted_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} event(s) with title "sample2"')
            )
        else:
            self.stdout.write(
                self.style.WARNING('No events found with title "sample2"')
            )
