import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, PurchaseOrder

ready_for_po_count = PurchaseRequest.objects.filter(status='completed').count()
pending_po_count = PurchaseRequest.objects.filter(status='ongoing').count()
po_generated_count = PurchaseOrder.objects.count()

print(f"READY_FOR_PO: {ready_for_po_count}")
print(f"PENDING_PO: {pending_po_count}")
print(f"PO_GENERATED: {po_generated_count}")
