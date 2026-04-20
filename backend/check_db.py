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
    print(f"Total Documents: {Document.objects.count()}")
    
    if ProcurementRecord.objects.exists():
        latest_record = ProcurementRecord.objects.order_by('-created_at').first()
        print(f"Latest Record: {latest_record.pr_no} - {latest_record.title}")
        
        docs = latest_record.documents.all()
        print(f"Documents for this record ({docs.count()}):")
        for doc in docs:
            print(f"  - {doc.subDoc}: {doc.status} (File: {doc.file.name if doc.file else 'None'})")
    else:
        print("No records found.")

if __name__ == "__main__":
    check_db()
