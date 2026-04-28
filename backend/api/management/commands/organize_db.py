from django.core.management.base import BaseCommand
from api.models import Document, ProcurementRecord
from decimal import Decimal
import json

class Command(BaseCommand):
    help = 'Ensures all database records are fully populated, complete, and organized.'

    def handle(self, *args, **options):
        records = ProcurementRecord.objects.all()
        updated_records = 0

        for record in records:
            changed = False

            # 1. Ensure procurement_type
            if not record.procurement_type:
                record.procurement_type = 'small_value'
                changed = True

            # 2. Sync total_amount from documents if missing
            if not record.total_amount:
                # Look for Purchase Request or PPMP with an amount
                docs_with_amount = record.documents.filter(total_amount__isnull=False).order_by('-total_amount')
                if docs_with_amount.exists():
                    record.total_amount = docs_with_amount.first().total_amount
                    changed = True
                else:
                    # Look for pr_items
                    docs_with_items = record.documents.exclude(pr_items='')
                    total = Decimal('0.00')
                    for doc in docs_with_items:
                        try:
                            items = json.loads(doc.pr_items)
                            for item in items:
                                q = Decimal(str(item.get('quantity', 0)))
                                c = Decimal(str(item.get('unit_cost', 0)))
                                total += (q * c)
                        except:
                            pass
                    if total > 0:
                        record.total_amount = total
                        changed = True

            # 3. Sync user_pr_no
            if not record.user_pr_no:
                pr_doc = record.documents.filter(user_pr_no__isnull=False).exclude(user_pr_no='').first()
                if pr_doc:
                    record.user_pr_no = pr_doc.user_pr_no
                    changed = True

            # 4. Sync source_of_fund
            if not record.source_of_fund:
                fund_doc = record.documents.filter(source_of_fund__isnull=False).exclude(source_of_fund='').first()
                if fund_doc:
                    record.source_of_fund = fund_doc.source_of_fund
                    changed = True

            if changed:
                record.save()
                updated_records += 1

        self.stdout.write(self.style.SUCCESS(f'Organized and completed {updated_records} Procurement Records.'))
        
        # 5. Make sure documents are also complete (e.g. if record has user_pr_no, ensure docs have it)
        docs_updated = 0
        for record in records:
            if record.user_pr_no:
                docs = record.documents.filter(subDoc='Purchase Request', user_pr_no='')
                for doc in docs:
                    doc.user_pr_no = record.user_pr_no
                    doc.save(update_fields=['user_pr_no'])
                    docs_updated += 1
                    
        self.stdout.write(self.style.SUCCESS(f'Synchronized {docs_updated} Documents with PR Nos.'))
