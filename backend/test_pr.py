import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, ProcurementRecord, User

def test_create_pr():
    try:
        # Get or create a PPMP
        record, _ = ProcurementRecord.objects.get_or_create(
            ppmp_no='TEST-2026',
            defaults={'pr_no': '2026-04-0001', 'title': 'Test Folder'}
        )
        
        print(f"Using PPMP: {record.id}")
        
        pr = PurchaseRequest.objects.create(
            ppmp=record,
            purpose="Test PR Creation",
            grand_total=1000.00,
            status='approved',
            created_by='TestUser'
        )
        print(f"Successfully created PR: {pr.id}")
        
    except Exception as e:
        print(f"Failed to create PR: {str(e)}")

if __name__ == "__main__":
    test_create_pr()
