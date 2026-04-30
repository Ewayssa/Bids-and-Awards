import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import ProcurementRecord, Document
from api.utils.workflow_logic import check_folder_readiness

def debug_9001():
    print("--- Debugging PPMP 9001 Readiness ---")
    record = ProcurementRecord.objects.filter(ppmp_no='9001').first()
    if not record:
        print("Record 9001 not found!")
        return

    print(f"Record: {record.title} (ID: {record.id})")
    print(f"Current is_ready: {record.is_ready}")
    print(f"User PR No: {record.user_pr_no}")
    
    docs = record.documents.all()
    print(f"\nDocuments in folder ({docs.count()}):")
    for d in docs:
        print(f" - {d.subDoc}: {d.status} (File: {bool(d.file)})")

    # Run check_folder_readiness
    ready = check_folder_readiness(record)
    print(f"\nResult of check_folder_readiness: {ready}")
    
    # Check required groups manually
    required_groups = [
        ['Activity Design'],
        ['Requisition and Issue Slip', 'RIS'],
        ['Market Scoping', 'Market Scoping / Canvass'],
        ['Project Procurement Management Plan', 'PPMP', 'Supplemental PPMP', 'Project Procurement Management Plan/Supplemental PPMP'],
        ['Annual Procurement Plan', 'APP']
    ]
    
    complete_subdocs = [str(doc.subDoc or '').strip() for doc in docs if doc.status == 'complete']
    print(f"\nComplete subdocs in folder: {complete_subdocs}")
    
    for group in required_groups:
        group_found = False
        for subdoc in complete_subdocs:
            if any(alias.lower() in subdoc.lower() for alias in group):
                group_found = True
                break
        
        if not group_found and ('Annual Procurement Plan' in group or 'APP' in group):
            if Document.objects.filter(subDoc__icontains='Annual Procurement Plan', year=record.year, status='complete').exists():
                group_found = True
                print("   [Global Match] Found APP globally.")

        if not group_found and any(k in str(group) for k in ['PPMP', 'Project Procurement Management Plan']):
             if Document.objects.filter(ppmp_no=record.ppmp_no, status='complete').filter(subDoc__icontains='PPMP').exists():
                 group_found = True
                 print("   [Global Match] Found PPMP globally.")

        print(f"Group {group}: {'FOUND' if group_found else 'MISSING'}")

    # Check Purchase Requests status
    print(f"\nPurchase Requests ({record.purchase_requests.count()}):")
    for pr in record.purchase_requests.all():
        print(f" - ID: {pr.id}, Status: {pr.status}")
        
    # Attempt to force sync
    from api.utils.workflow_logic import sync_supply_readiness
    print("\nForcing sync_supply_readiness...")
    sync_supply_readiness(record)
    
    # Check again
    print("\nAfter sync:")
    for pr in record.purchase_requests.all():
        print(f" - ID: {pr.id}, Status: {pr.status}")

if __name__ == "__main__":
    debug_9001()
