from django.core.management.base import BaseCommand
from api.models import Document, ProcurementRecord
from api.utils.workflow_logic import sync_procurement_completion

class Command(BaseCommand):
    help = 'Fixes the database by removing deprecated records, initializing stages, and syncing statuses.'

    def handle(self, *args, **options):
        # 1. Delete Deprecated Documents
        deprecated_types = ['Activity Design', 'Requisition and Issue Slip', 'Market Scoping']
        deleted_count, _ = Document.objects.filter(subDoc__in=deprecated_types).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} deprecated Document(s).'))

        # 2. Synchronize PR Numbers across all documents in a folder
        records_with_pr = ProcurementRecord.objects.filter(user_pr_no__isnull=False).exclude(user_pr_no='')
        sync_count = 0
        for record in records_with_pr:
            # Propagate the folder's official PR No. to all its documents
            updated = record.documents.exclude(user_pr_no=record.user_pr_no).update(user_pr_no=record.user_pr_no)
            sync_count += updated
        self.stdout.write(self.style.SUCCESS(f'Synchronized PR No. for {sync_count} Document(s).'))

        # 3. Recalculate Document statuses
        docs = Document.objects.all()
        doc_updates = 0
        for doc in docs:
            old_status = doc.status
            new_status = doc.calculate_status()
            if old_status != new_status:
                doc.status = new_status
                doc.save(update_fields=['status'])
                doc_updates += 1
                
        self.stdout.write(self.style.SUCCESS(f'Recalculated status for {doc_updates} Document(s).'))
        self.stdout.write(self.style.SUCCESS('Database fix complete!'))
