import os
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from ..models import Document, Report, ProcurementRecord, User
from ..permissions import CanUploadDocuments, IsBACSecretariat, is_bac_member, is_bac_secretariat
from ..serializers import DocumentSerializer, ReportSerializer
from ..utils.workflow_logic import sync_procurement_completion
from .helpers import _log_audit, _create_notification, _inline_file_response

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-uploaded_at')
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Document.objects.all().order_by('-uploaded_at')

        category = self.request.query_params.get('category', '').strip()
        if category:
            queryset = queryset.filter(category__icontains=category)

        sub_doc = self.request.query_params.get('subDoc', '').strip()
        if sub_doc:
            queryset = queryset.filter(subDoc__icontains=sub_doc)

        pr_no = self.request.query_params.get('prNo', '').strip()
        if pr_no:
            queryset = queryset.filter(prNo=pr_no)
        
        ppmp_no = self.request.query_params.get('ppmp_no', '').strip()
        if ppmp_no:
            queryset = queryset.filter(ppmp_no=ppmp_no)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action in ['preview']:
            return [AllowAny()]
        elif self.action in ['create']:
            return [IsAuthenticated(), CanUploadDocuments()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsBACSecretariat()]
        return [IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        return response

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_bac_secretariat(user):
            return Response(
                {'detail': 'Only BAC Secretariat can edit documents.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not is_bac_secretariat(user):
            return Response(
                {'detail': 'Only BAC Secretariat can delete documents.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        if not serializer.validated_data.get('uploadedBy'):
            serializer.validated_data['uploadedBy'] = self.request.user.fullName or self.request.user.username

        doc = serializer.save()
        title = (doc.title or doc.prNo or 'Document')[:80]
        _log_audit('document_created', doc.uploadedBy or 'Unknown', 'document', str(doc.id), title)

        if 'Project Procurement Management Plan' in doc.subDoc:
            _create_notification(f'New PPMP submitted: {title}', link='/encode', recipient_role='bac_secretariat')
        elif 'Annual Procurement Plan' in doc.subDoc:
            _create_notification(f'New APP submitted: {title}', link='/encode', recipient_role='bac_secretariat')
        else:
            _create_notification(f'New BAC document submitted: {title}', recipient_role='bac_secretariat')

        # Sync procurement folder status if a folder exists for this prNo
        if doc.prNo:
            sync_procurement_completion(doc.prNo)

    def perform_update(self, serializer):
        from ..utils.document_status import DocumentStatusCalculator
        old_status = DocumentStatusCalculator.calculate_status(serializer.instance)
        doc = serializer.save()
        doc.refresh_from_db()
        title = (doc.title or doc.prNo or 'Document')[:80]
        actor = self.request.user.username
        _log_audit('document_updated', actor, 'document', str(doc.id), title)
        _create_notification(f'BAC document updated: {title}', recipient_role='bac_secretariat')
        if doc.status == 'complete' and old_status != 'complete':
            _log_audit('document_completed', actor, 'document', str(doc.id), title)
            _create_notification(f'BAC document completed: {title}', admin_only=True)
            
        # Sync procurement folder status if a folder exists for this prNo
        if doc.prNo:
            sync_procurement_completion(doc.prNo)

    @action(detail=True, methods=['post'], url_path='update_pr_file')
    def update_pr_file(self, request, pk=None):
        """
        Allow BAC Members to replace the file on a Purchase Request Document
        after assigning an official PR number. Only the 'file' field is updated.
        """
        doc = self.get_object()
        if not is_bac_member(request.user):
            return Response({'error': 'Only BAC Members are authorized to update PR files.'}, status=status.HTTP_403_FORBIDDEN)

        if doc.subDoc and 'Purchase Request' not in doc.subDoc:
            return Response({'error': 'This action is only permitted on Purchase Request documents.'}, status=status.HTTP_400_BAD_REQUEST)

        new_file = request.FILES.get('file')
        if not new_file:
            return Response({'error': 'A file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Delete the old file from storage if it exists
        if doc.file:
            try:
                import os
                if os.path.isfile(doc.file.path):
                    os.remove(doc.file.path)
            except Exception:
                pass  # Best-effort cleanup

        doc.file = new_file
        if request.data.get('title'):
            doc.title = request.data.get('title')
        doc.save()
        doc.refresh_from_db()

        return Response(DocumentSerializer(doc).data)

    @action(detail=True, methods=['post'])
    def assign_pr_no(self, request, pk=None):
        """Assign an official PR number to the procurement record linked by this document's prNo."""
        doc = self.get_object()
        if not is_bac_member(request.user):
            return Response({'error': 'Only BAC Members are authorized to assign PR numbers.'}, status=status.HTTP_403_FORBIDDEN)

        user_pr_no = request.data.get('user_pr_no', '').strip()
        if not user_pr_no:
            return Response({'error': 'PR Number is required'}, status=status.HTTP_400_BAD_REQUEST)

        if ProcurementRecord.objects.filter(user_pr_no=user_pr_no).exists():
            return Response({'error': f'PR No. "{user_pr_no}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Find the procurement record linked by prNo
        record = doc.prNo if doc.prNo else None
        if record and record.user_pr_no:
            return Response({'error': 'PR No. is already assigned to this procurement record and cannot be updated.'}, status=status.HTTP_400_BAD_REQUEST)

        if record:
            record.user_pr_no = user_pr_no
            record.save(update_fields=['user_pr_no'])
            from ..utils.workflow_logic import check_folder_readiness
            check_folder_readiness(record)
            sync_procurement_completion(record)

        # Notify the end user (uploader) about the PR assignment
        uploader_name = doc.uploadedBy
        if uploader_name:
            uploader = User.objects.filter(username=uploader_name).first() or \
                       User.objects.filter(fullName=uploader_name).first()
            if uploader:
                _create_notification(
                    f"Official PR No. '{user_pr_no}' has been assigned to your request: {doc.title or doc.subDoc}",
                    link='/my-documents',
                    recipient=uploader
                )

        return Response(DocumentSerializer(doc).data)

    @action(detail=True, methods=['get'], url_path='preview', permission_classes=[AllowAny])
    def preview(self, request, pk=None):
        doc = self.get_object()
        if not doc.file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return _inline_file_response(doc.file)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        doc_id, title = str(instance.id), (instance.title or instance.prNo or 'Document')[:80]
        actor = self.request.user.username
        pr_no = instance.prNo
        super().perform_destroy(instance)
        if pr_no:
            sync_procurement_completion(pr_no)
        _log_audit('document_deleted', actor, 'document', doc_id, title)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-uploaded_at')
    serializer_class = ReportSerializer

    def perform_create(self, serializer):
        report = serializer.save()
        if not report.title:
            report.title = report.file.name if report.file else 'Untitled Report'
            report.save()
        _log_audit('report_created', report.uploadedBy or 'Unknown', 'report', str(report.id), report.title[:80])

    @action(detail=True, methods=['get'], url_path='preview', permission_classes=[AllowAny])
    def preview(self, request, pk=None):
        report = self.get_object()
        if not report.file: return Response({'detail': 'No file.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            return _inline_file_response(report.file)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
