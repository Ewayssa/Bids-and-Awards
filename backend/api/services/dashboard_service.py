from datetime import timedelta
from django.utils import timezone
from ..models import Document, CalendarEvent, Notification, CHECKLIST_DOC_TYPES

class DashboardService:
    @staticmethod
    def get_document_status_counts(docs_qs):
        """
        Count documents by real-time status (calculate_status per document).
        """
        completed = ongoing = pending = 0
        for doc in docs_qs:
            status = (doc.calculate_status() or '').lower().strip() or 'ongoing'
            if status == 'complete':
                completed += 1
            elif status == 'pending':
                pending += 1
            else:
                ongoing += 1
        return {
            'total': completed + ongoing + pending,
            'completed': completed,
            'ongoing': ongoing,
            'pending': pending
        }

    @staticmethod
    def get_checklist_counts(docs_qs):
        """
        Compute checklist counts based on CHECKLIST_DOC_TYPES slots.
        """
        docs = list(docs_qs)
        completed = ongoing = pending = 0
        
        for category, sub_docs in CHECKLIST_DOC_TYPES:
            cat_trim = (category or '').strip()
            for sub_doc in sub_docs:
                sub_trim = (sub_doc or '').strip()
                matches = [
                    d for d in docs
                    if (d.category or '').strip() == cat_trim and (d.subDoc or '').strip() == sub_trim
                ]
                
                if not matches:
                    pending += 1
                else:
                    any_complete = any(
                        (m.calculate_status() or '').lower().strip() == 'complete'
                        for m in matches
                    )
                    if any_complete:
                        completed += 1
                    else:
                        ongoing += 1
                        
        return {
            'total': completed + ongoing + pending,
            'completed': completed,
            'ongoing': ongoing,
            'pending': pending
        }

    @classmethod
    def get_dashboard_data(cls, uploaded_by=None):
        docs_qs = Document.objects.all().order_by('-uploaded_at')
        if uploaded_by:
            docs_qs = docs_qs.filter(uploadedBy=uploaded_by)

        status_counts = cls.get_document_status_counts(docs_qs)
        checklist_counts = cls.get_checklist_counts(docs_qs)
        
        completed_docs = status_counts['completed']
        ongoing_docs = status_counts['ongoing']
        pending_slots = checklist_counts['pending']
        total = completed_docs + ongoing_docs + pending_slots
        
        pie_data = [total, completed_docs, ongoing_docs, pending_slots]
        total_documents_uploaded = docs_qs.count()

        # Procurement method counts
        docs_list = list(docs_qs)
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
        qs = Document.objects.all().order_by('-uploaded_at')
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
