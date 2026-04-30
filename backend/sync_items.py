import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, PurchaseRequestItem
prs = PurchaseRequest.objects.all()
count = 0
for pr in prs:
    # This will trigger the new save() logic that pulls from ppmp
    pr.save()
    updated = PurchaseRequestItem.objects.filter(purchase_request=pr).update(pr_no=pr.pr_no)
    count += 1
    print(f"PR {pr.pr_no}: Updated {updated} items")
print(f"Total PRs processed: {count}")
