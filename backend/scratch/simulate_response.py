import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest, PurchaseOrder
from api.serializers import PurchaseRequestSerializer, PurchaseOrderSerializer

def get_data():
    ready_for_po_count = PurchaseRequest.objects.filter(status='completed').count()
    pending_po_count = PurchaseRequest.objects.filter(status='ongoing').count()
    po_generated_count = PurchaseOrder.objects.count()
    
    recent_ready_prs = PurchaseRequest.objects.filter(status='completed').order_by('-created_at')[:5]
    pr_serializer = PurchaseRequestSerializer(recent_ready_prs, many=True)
    
    recent_pos = PurchaseOrder.objects.all().order_by('-created_at')[:5]
    po_serializer = PurchaseOrderSerializer(recent_pos, many=True)
    
    data = {
        'stats': {
            'ready_for_po': ready_for_po_count,
            'pending_po': pending_po_count,
            'po_generated': po_generated_count
        },
        'recent_ready_prs': pr_serializer.data,
        'recent_pos': po_serializer.data
    }
    return data

if __name__ == "__main__":
    print(json.dumps(get_data(), indent=2))
