from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import PurchaseRequest, PurchaseOrder
from ..serializers import PurchaseRequestSerializer, PurchaseOrderSerializer
from ..permissions import is_bac_secretariat, is_bac_chair
from ..services.dashboard_service import DashboardService
from ..utils.document_helpers import get_next_transaction_number

@api_view(['GET'])
def next_transaction_number(request):
    date_param = request.query_params.get('date', '').strip()
    return Response({'next_transaction_number': get_next_transaction_number(date=date_param or None)})

@api_view(['GET'])
def get_dashboard_data(request):
    uploaded_by = request.query_params.get('uploadedBy', '').strip()
    user = request.user
    is_admin = is_bac_secretariat(user)
    data = DashboardService.get_dashboard_data(uploaded_by=uploaded_by, is_admin=is_admin)
    data['user_role'] = user.role
    data['is_bac_secretariat'] = is_admin
    data['is_bac_chair'] = is_bac_chair(user)
    return Response(data, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_supply_dashboard_data(request):
    # Relaxed query: Any PR with a number that doesn't have a PO yet should be visible to Supply
    ready_prs_qs = PurchaseRequest.objects.exclude(pr_no='').exclude(pr_no__isnull=True).exclude(purchase_orders__isnull=False)
    
    ready_for_po_count = ready_prs_qs.count()
    pending_po_count = PurchaseRequest.objects.filter(status='ongoing').count()
    po_generated_count = PurchaseOrder.objects.exclude(status='cancelled').count()
    
    recent_ready_prs = ready_prs_qs.order_by('-created_at')[:50]
    pr_serializer = PurchaseRequestSerializer(recent_ready_prs, many=True)
    recent_pos = PurchaseOrder.objects.all().order_by('-created_at')[:50]
    po_serializer = PurchaseOrderSerializer(recent_pos, many=True)
    
    return Response({
        'stats': {
            'ready_for_po': ready_for_po_count,
            'pending_po': pending_po_count,
            'po_generated': po_generated_count
        },
        'recent_ready_prs': pr_serializer.data,
        'recent_pos': po_serializer.data
    }, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})
