import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, ProcurementRecord
from api.utils.workflow_logic import check_folder_readiness

def sync_all_pr_statuses():
    print("Starting Global PR Status Sync...")
    
    # Update legacy 'approved' to 'completed' for now, then recalculate
    updated = PurchaseRequest.objects.filter(status='approved').update(status='completed')
    print(f"Migrated {updated} 'approved' PRs to 'completed' as a baseline.")
    
    # Update 'pending' to 'ongoing'
    updated = PurchaseRequest.objects.filter(status='pending').update(status='ongoing')
    print(f"Migrated {updated} 'pending' PRs to 'ongoing'.")

    # Now recalculate readiness for all folders
    folders = ProcurementRecord.objects.all()
    count = folders.count()
    print(f"Processing {count} folders...")
    
    for i, folder in enumerate(folders):
        check_folder_readiness(folder)
        if (i+1) % 10 == 0:
            print(f"Processed {i+1}/{count} folders...")
            
    print("Global Sync Completed.")

if __name__ == "__main__":
    sync_all_pr_statuses()
