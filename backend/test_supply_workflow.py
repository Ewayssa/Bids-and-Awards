import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, ProcurementRecord, Document, User
from api.utils.workflow_logic import check_folder_readiness, sync_supply_readiness

def test_workflow():
    print("Starting Workflow Test...")
    
    # 1. Create a user if not exists
    user, _ = User.objects.get_or_create(username='testuser', defaults={'role': 'end_user', 'fullName': 'Test User'})
    
    # 2. Create a Procurement Record (Folder)
    record = ProcurementRecord.objects.create(
        pr_no='2026-04-001',
        title='Test Procurement',
        ppmp_no='PPMP-2026-001'
    )
    print(f"Created Folder: {record.pr_no}, is_ready: {record.is_ready}")
    
    # 3. Create a Purchase Request
    pr = PurchaseRequest.objects.create(
        ppmp=record,
        purpose='Test Purpose',
        grand_total=1000.00
    )
    print(f"Created PR: status={pr.status}") # Should be 'ongoing'
    
    # 4. Create a PR Document (incomplete)
    doc = Document.objects.create(
        procurement_record=record,
        subDoc='Purchase Request',
        category='Procurement',
        # Missing total_amount and other fields
        uploadedBy='testuser',
        ppmp_no='PPMP-2026-001',
        prNo='2026-04-001'
    )
    print(f"Created Incomplete PR Document: status={doc.status}") # Should be 'ongoing' or 'complete' depending on calculator
    
    # Check readiness
    check_folder_readiness(record)
    record.refresh_from_db()
    pr.refresh_from_db()
    print(f"After Incomplete PR Doc: Folder is_ready={record.is_ready}, PR status={pr.status}")
    
    # Now complete the PR doc
    doc.total_amount = 1000.00
    doc.date = '2026-04-30'
    doc.save()
    print(f"Completed PR Document: status={doc.status}")
    
    # 5. Add mandatory docs to make it ready
    mandatory_types = [
        'Activity Design', 
        'Requisition and Issue Slip', 
        'Market Scoping',
        'Project Procurement Management Plan',
        'Annual Procurement Plan'
    ]
    for t in mandatory_types:
        Document.objects.create(
            procurement_record=record,
            subDoc=t,
            category='Procurement',
            uploadedBy='testuser',
            ppmp_no='PPMP-2026-001',
            prNo='2026-04-001',
            file='test.pdf', # mock file
            date='2026-04-30'
        )
    
    check_folder_readiness(record)
    record.refresh_from_db()
    pr.refresh_from_db()
    print(f"After Mandatory Docs: Folder is_ready={record.is_ready}, PR status={pr.status}")
    # Folder should be ready, but PR status should still be 'ongoing' because no user_pr_no (assigned by BAC)
    
    # 6. Assign PR No by BAC
    record.user_pr_no = 'BAC-PR-2026-001'
    record.save()
    
    # Sync again
    sync_supply_readiness(record)
    pr.refresh_from_db()
    print(f"After BAC Assigns PR No: PR status={pr.status}") # Should be 'completed'
    
    # Cleanup
    record.delete()
    print("Test Completed and Cleanup Done.")

if __name__ == "__main__":
    test_workflow()
