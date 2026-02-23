from django.core.management.base import BaseCommand
from api.models import Document


class Command(BaseCommand):
    help = 'Recalculate status for all documents based on completeness'

    def handle(self, *args, **options):
        documents = Document.objects.all()
        updated_count = 0
        
        for doc in documents:
            old_status = doc.status
            # Recalculate status
            new_status = doc.calculate_status()
            
            if old_status != new_status:
                doc.status = new_status
                doc.save(update_fields=['status'])
                updated_count += 1
                self.stdout.write(
                    f'Updated document "{doc.title or doc.prNo}" (ID: {doc.id}): {old_status} -> {new_status}'
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully recalculated status for {updated_count} document(s)')
        )
        self.stdout.write(
            self.style.SUCCESS(f'Total documents processed: {documents.count()}')
        )
