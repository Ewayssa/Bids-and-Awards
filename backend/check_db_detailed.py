import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import Document, ProcurementRecord

def check_db():
    print(f"Total Procurement Records: {ProcurementRecord.objects.count()}")
    for r in ProcurementRecord.objects.all():
        print(f"Record: ID={r.id}, PR_NO={r.pr_no}, Title={r.title}")
    
    print(f"\nTotal Documents: {Document.objects.count()}")
    for d in Document.objects.all():
        print(f"Document: ID={d.id}, PR_NO={d.prNo}, SubDoc={d.subDoc}, Record_Link={d.procurement_record_id}")

if __name__ == "__main__":
    check_db()
