import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest

print("ID | PR_NO | STATUS | HAS_PO | PPMP")
print("-" * 50)
for pr in PurchaseRequest.objects.all().order_by('-created_at')[:20]:
    pos = list(pr.purchase_orders.all())
    po_info = ", ".join([f"{po.po_no}({po.status})" for po in pos])
    print(f"{pr.id} | {pr.pr_no} | {pr.status} | {len(pos)} POs: [{po_info}] | {pr.ppmp}")
