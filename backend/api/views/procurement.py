from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import ProcurementRecord, Document
from ..serializers import ProcurementRecordSerializer, DocumentSerializer
from ..utils.workflow_logic import get_missing_required_files, sync_procurement_completion
from .helpers import _log_audit, _create_notification

class ProcurementRecordViewSet(viewsets.ModelViewSet):
    queryset = ProcurementRecord.objects.all().order_by('-created_at')
    serializer_class = ProcurementRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        role = (getattr(user, 'role', None) or '').strip().lower()

        # Filtering based on role
        if role in ('bac_secretariat', 'bac_chair', 'admin', 'bac_member'):
            # Admin and BAC staff see all records
            pass
        elif role == 'end_user':
            # End Users see all records (Frontend will handle restricted view/edit)
            pass
        # Add other roles if needed (e.g., supply officer, bac member)
        
        status_param = self.request.query_params.get('status', '').strip()
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Uniqueness check for PPMP No
        ppmp_no = data.get('ppmp_no', '').strip()
        if ppmp_no and ProcurementRecord.objects.filter(ppmp_no=ppmp_no).exists():
            return Response({'error': f'A procurement record with PPMP No. "{ppmp_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Uniqueness check for PR No (User-assigned)
        user_pr_no = data.get('user_pr_no', '').strip()
        if user_pr_no and ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists():
            return Response({'error': f'PR No. "{user_pr_no}" is already assigned to another record.'}, status=status.HTTP_400_BAD_REQUEST)

        data['created_by'] = request.user.fullName or request.user.username
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        _log_audit('procurement_record_created', request.user.username, 'procurement_record', str(record.id), f'{record.pr_no} - {record.title}')
        
        # Notify BAC Secretariat/Admin about new Procurement Folder (PR)
        _create_notification(
            f"New Procurement Folder created: {record.pr_no} - {record.title}",
            link='/procurement',
            recipient_role='bac_secretariat'
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance = serializer.save()
        _log_audit('procurement_record_updated', self.request.user.username, 'procurement_record', str(instance.id), f'{instance.pr_no} - {instance.title}')

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        record = self.get_object()
        docs = Document.objects.filter(prNo=record.pr_no)

        stage = request.query_params.get('stage', '').strip()
        if stage:
            stage_config = {
                'initial': ['Initial Documents'],
                'pre_procurement': ['Pre-Procurement'],
                'rfq': ['RFQ Concerns'],
                'bac_meeting': ['BAC Meeting Documents'],
                'award': ['Award Documents'],
                'posting': ['Award Posting'],
                'post_award': ['Post-Award'],
            }
            categories = stage_config.get(stage, [])
            if categories:
                from django.db.models import Q
                q = Q()
                for cat in categories:
                    q |= Q(category__icontains=cat)
                docs = docs.filter(q)

        return Response(DocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['post'])
    def recalculate_status(self, request, pk=None):
        record = self.get_object()
        sync_procurement_completion(record)
        record.refresh_from_db()
        return Response({
            'status': record.status,
            'missing': get_missing_required_files(record),
        })
