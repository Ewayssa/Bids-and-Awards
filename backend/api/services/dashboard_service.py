from datetime import timedelta
from django.utils import timezone
from ..models import Document, CalendarEvent, Notification
from ..utils.document_status import DocumentStatusCalculator


class DashboardService:
    @staticmethod
    def get_document_status_counts(docs_qs):
        """
        Count uploaded documents by calculated status (form completeness).
        """
        uploaded_docs = list(docs_qs.filter(uploaded_at__isnull=False))

        total_docs = len(uploaded_docs)
        completed_docs = sum(1 for d in uploaded_docs if (d.calculate_status() or '').lower().strip() == 'complete')
        ongoing_docs = sum(1 for d in uploaded_docs if (d.calculate_status() or '').lower().strip() == 'ongoing')
        pending_docs = max(0, total_docs - completed_docs - ongoing_docs)

        return {
            'total': total_docs,
            'completed': completed_docs,
            'ongoing': ongoing_docs,
            'pending': pending_docs
        }

    @staticmethod
    def get_checklist_global_pending(docs_qs):
        """Global checklist pending slots across all folders."""
        docs = list(docs_qs.filter(uploaded_at__isnull=False))
        
        folders = {}
        for d in docs:
            pr = (d.prNo or '').strip()
            if pr:
                if pr not in folders:
                    folders[pr] = []
                folders[pr].append(d)
        
        pending_slot = 0
        
        for pr, folder_docs in folders.items():
            is_svp = any('Small Value Procurement' in (d.subDoc or '') for d in folder_docs)
            is_pb = any('Public Bidding' in (d.subDoc or '') for d in folder_docs)
            
            for category, sub_docs in DocumentStatusCalculator.CHECKLIST_DOC_TYPES:
                cat_trim = (category or '').strip()
                for sub_doc in sub_docs:
                    sub_trim = (sub_doc or '').strip()
                    
                    if is_svp and 'Public Bidding' in sub_trim:
                        continue
                    if is_pb and 'Small Value Procurement' in sub_trim:
                        continue
                    
                    matches = [
                        d for d in folder_docs
                        if (d.category or '').strip() == cat_trim and (d.subDoc or '').strip() == sub_trim
                    ]
                    
                    if not matches:
                        pending_slot += 1
                            
        return pending_slot

    @classmethod
    def get_dashboard_data(cls, uploaded_by=None):
        docs_qs = Document.objects.all().order_by('-uploaded_at')
        if uploaded_by:
            docs_qs = docs_qs.filter(uploadedBy=uploaded_by)

        doc_counts = cls.get_document_status_counts(docs_qs)
        
        pie_data = [
            doc_counts['total'],
            doc_counts['completed'],
            doc_counts['ongoing'],
            cls.get_checklist_global_pending(docs_qs)
        ]
        
        total_documents_uploaded = docs_qs.filter(uploaded_at__isnull=False).count()

        docs_list = list(docs_qs.filter(uploaded_at__isnull=False))
        procurement_method_counts = {
            'List of Venue': cls._count_subdoc(docs_list, 'List of Venue'),
            'Small Value Procurement': cls._count_subdoc(docs_list, 'Small Value Procurement'),
            'Public Bidding': cls._count_subdoc(docs_list, 'Public Bidding'),
        }

        today = timezone.now().date()
        calendar_events = cls._get_calendar_events(today)
        recent_submissions = cls._get_recent_submissions(uploaded_by)
        recent_activity = cls._get_recent_activity()

        return {
            'pieData': pie_data,
            'totalDocumentsUploaded': total_documents_uploaded,
            'procurementMethodCounts': procurement_method_counts,
            'calendarEvents': calendar_events,
            'recentSubmissions': recent_submissions,
            'recentActivity': recent_activity,
        }

    @staticmethod
    def _count_subdoc(docs, pattern):
        if pattern == 'List of Venue':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'List of Venue' or ((d.subDoc or '').strip().endswith(' - List of Venue')))
        if pattern == 'Small Value Procurement':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'Small Value Procurement' or ((d.subDoc or '').strip().endswith(' - Small Value Procurement')))
        if pattern == 'Public Bidding':
            return sum(1 for d in docs if (d.subDoc or '').strip() == 'Public Bidding' or ((d.subDoc or '').strip().endswith(' - Public Bidding')))
        return 0

    @staticmethod
    def _get_calendar_events(today):
        start_date = today - timedelta(days=365)
        end_date = today + timedelta(days=365)
        events_qs = CalendarEvent.objects.filter(
            date__gte=start_date, date__lte=end_date
        ).order_by('date')
        return [
            {'id': str(e.id), 'title': e.title, 'date': e.date.isoformat()}
            for e in events_qs
        ]

    @staticmethod
    def _get_recent_submissions(uploaded_by, limit=5):
        qs = Document.objects.filter(uploaded_at__isnull=False).order_by('-uploaded_at')
        if uploaded_by:
            qs = qs.filter(uploadedBy=uploaded_by)
        return [
            {
                'id': str(d.id),
                'title': d.title or '—',
                'category': d.category or '—',
                'status': d.calculate_status(),
                'date_submitted': d.uploaded_at.isoformat() if d.uploaded_at else None,
                'prNo': d.prNo or '—',
            }
            for d in qs[:limit]
        ]

    @staticmethod
    def _get_recent_activity(limit=5):
        return [
            {'message': n.message, 'created_at': n.created_at.isoformat(), 'id': str(n.id)}
            for n in Notification.objects.all().order_by('-created_at')[:limit]
        ]

