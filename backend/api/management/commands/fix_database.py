from django.core.management.base import BaseCommand
from api.models import Document, ProcurementRecord, ProcurementStageStatus
from api.utils.workflow_logic import sync_procurement_completion

class Command(BaseCommand):
    help = 'Fixes the database by removing deprecated records, initializing stages, and syncing statuses.'

    def handle(self, *args, **options):
        # 1. Delete Deprecated Documents
        deprecated_types = ['Activity Design', 'Requisition and Issue Slip', 'Market Scoping']
        deleted_count, _ = Document.objects.filter(subDoc__in=deprecated_types).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} deprecated Document(s).'))

        # 2. Ensure ProcurementStageStatus for all ProcurementRecords (1-12)
        STAGES = [
            (1, 'Draft / Needs Identification'),
            (2, 'Preparation of Documents'),
            (3, 'Under Review'),
            (4, 'For Revision / Approval'),
            (5, 'Approved for Input'),
            (6, 'For Posting'),
            (7, 'For Float'),
            (8, 'For Schedule (Meeting)'),
            (9, 'Under Evaluation'),
            (10, 'For Award'),
            (11, 'Awarded / Post-Award'),
            (12, 'For Liquidation')
        ]
        
        records = ProcurementRecord.objects.all()
        stage_created_count = 0
        for record in records:
            for stage_number, stage_name in STAGES:
                obj, created = ProcurementStageStatus.objects.get_or_create(
                    procurement_record=record,
                    stage_number=stage_number,
                    defaults={'stage_name': stage_name}
                )
                if created:
                    stage_created_count += 1
            
            # 3. Synchronize PR status
            sync_procurement_completion(record)

        self.stdout.write(self.style.SUCCESS(f'Initialized {stage_created_count} ProcurementStageStatus record(s).'))

        # 4. Recalculate Document statuses
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
