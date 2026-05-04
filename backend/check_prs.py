import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import PurchaseRequest, ProcurementRecord

print("=== PURCHASE REQUESTS ===")
prs = PurchaseRequest.objects.all()
if not prs.exists():
    print("  No PRs found in DB!")
else:
    for p in prs:
        ppmp_ready = p.ppmp.is_ready if p.ppmp else "NO PPMP"
        print(f"  - Purpose : {p.purpose[:40]}")
        print(f"    Status  : {p.status}")
        print(f"    PR No.  : {p.pr_no or '(none)'}")
        print(f"    is_ready: {ppmp_ready}")
        print()

print("=== PROCUREMENT RECORDS ===")
for r in ProcurementRecord.objects.all():
    prs_in_folder = r.purchase_requests.count()
    print(f"  Folder: {r.title[:40]} | is_ready: {r.is_ready} | PRs: {prs_in_folder}")
