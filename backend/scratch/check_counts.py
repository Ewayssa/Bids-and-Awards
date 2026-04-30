import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, ProcurementRecord

print("--- Purchase Request Status Counts ---")
for status in ['ongoing', 'completed', 'po_generated', 'cancelled']:
    count = PurchaseRequest.objects.filter(status=status).count()
    print(f"{status}: {count}")

print("\n--- Procurement Record (Folder) Readiness ---")
print(f"Total Folders: {ProcurementRecord.objects.count()}")
print(f"Ready (is_ready=True): {ProcurementRecord.objects.filter(is_ready=True).count()}")
print(f"With PR No (user_pr_no set): {ProcurementRecord.objects.exclude(user_pr_no='').exclude(user_pr_no__isnull=True).count()}")
print(f"Both (Ready for Supply): {ProcurementRecord.objects.filter(is_ready=True).exclude(user_pr_no='').exclude(user_pr_no__isnull=True).count()}")

print("\n--- Sample Completed PRs ---")
for pr in PurchaseRequest.objects.filter(status='completed')[:5]:
    print(f"ID: {pr.id}, PR No: {pr.pr_no}, Folder: {pr.ppmp.pr_no if pr.ppmp else 'N/A'}")
