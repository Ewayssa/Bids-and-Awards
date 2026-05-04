from django.core.management.base import BaseCommand
from api.models import Document, ProcurementRecord


class Command(BaseCommand):
    help = 'Ensures all database records are organized and procurement_type defaults are set.'

    def handle(self, *args, **options):
        records = ProcurementRecord.objects.all()
        updated_records = 0

        for record in records:
            changed = False

            # Ensure procurement_type has a default
            if not record.procurement_type:
                record.procurement_type = 'small_value'
                changed = True

            if changed:
                record.save()
                updated_records += 1

        self.stdout.write(self.style.SUCCESS(f'Organized {updated_records} Procurement Records.'))
