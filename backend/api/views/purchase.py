from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from ..models import PurchaseRequest, PurchaseOrder
from ..serializers import PurchaseRequestSerializer, PurchaseOrderSerializer
from ..permissions import is_bac_member
from ..utils.workflow_logic import sync_procurement_completion
from .helpers import _log_audit, _create_notification

class PurchaseRequestViewSet(viewsets.ModelViewSet):
    queryset = PurchaseRequest.objects.all().order_by('-created_at')
    serializer_class = PurchaseRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        role = (getattr(user, 'role', None) or '').strip().lower()

        if role in ('bac_secretariat', 'bac_chair', 'admin'):
            # BAC staff see all PRs
            pass
        elif role == 'bac_member':
            # BAC members only see completed PRs
            qs = qs.filter(status='completed')
        elif role == 'supply':
            # Supply Officer only sees completed PRs with an assigned PR No. that DON'T have a PO yet
            qs = qs.filter(status='completed').exclude(pr_no='').exclude(pr_no__isnull=True).exclude(purchase_orders__isnull=False)
        else:
            # End Users only see their own PRs
            qs = qs.filter(created_by=user.fullName or user.username)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
            if status_param == 'completed':
                qs = qs.exclude(purchase_orders__isnull=False)

        ppmp_id = self.request.query_params.get('ppmp_id')
        if ppmp_id:
            qs = qs.filter(ppmp_id=ppmp_id)
        return qs

    def perform_create(self, serializer):
        pr = serializer.save(created_by=self.request.user.fullName or self.request.user.username)
        _log_audit('purchase_request_created', self.request.user.username, 'purchase_request', str(pr.id), f'PR for {pr.purpose[:50]}')
        
        # Ensure status is synced if linked to a folder
        if pr.ppmp:
            sync_procurement_completion(pr.ppmp)

    def perform_update(self, serializer):
        if 'pr_no' in self.request.data:
            user = self.request.user
            if not is_bac_member(user):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only BAC Members are authorized to assign PR numbers.")
        pr = serializer.save()
        _log_audit('purchase_request_updated', self.request.user.username, 'purchase_request', str(pr.id), f'Updated PR {pr.pr_no}')
        
        # Re-sync status after update (this will flip status to 'completed' if pr_no + is_ready)
        if pr.ppmp:
            sync_procurement_completion(pr.ppmp)

        # Notify Supply Officer if a PR number was just assigned
        if 'pr_no' in self.request.data and pr.pr_no:
            _create_notification(
                f"Purchase Request '{pr.purpose[:60]}' has been assigned PR No. {pr.pr_no} and is now ready for Purchase Order generation.",
                link='/supply/generate-po',
                recipient_role='supply',
            )

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        po = serializer.save(created_by=self.request.user.fullName or self.request.user.username)
        if po.purchase_request:
            pr = po.purchase_request
            pr.status = 'po_generated'
            pr.save(update_fields=['status'])
        _log_audit('purchase_order_generated', self.request.user.username, 'purchase_order', str(po.id), f'PO {po.po_no}')
        _create_notification(f'New Purchase Order generated: {po.po_no}', recipient_role='bac_secretariat')

    @action(detail=False, methods=['get'])
    def next_sequence(self, request):
        year = request.query_params.get('year')
        if not year:
            year = timezone.now().year
        
        # Fetch all PO numbers for the given year to find the true maximum sequence
        pos = PurchaseOrder.objects.filter(po_date__year=year).values_list('po_no', flat=True)
        
        max_seq = 0
        for po_no in pos:
            try:
                # Expecting format YYYY-MM-SEQ (e.g. 2026-04-001)
                parts = po_no.split('-')
                if len(parts) >= 3:
                    seq = int(parts[-1])
                    if seq > max_seq:
                        max_seq = seq
            except (ValueError, IndexError):
                continue
        
        return Response({'next_sequence': max_seq + 1})
