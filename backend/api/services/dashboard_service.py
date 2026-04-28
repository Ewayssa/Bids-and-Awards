from django.db.models import Count, Q
from api.models import Document, ProcurementRecord

class DashboardService:
    # Simplified Requirement Lists (Short Labels)
    DEFAULT_REQUIREMENTS = [
        'Purchase Request', 'PPMP', 'APP',
        'PhilGEPS Posting (RFQ)', 'Certificate of Posting (RFQ)', 'Request for Quotation', 'Supplier Quotations', 'Documentary Requirements',
        'Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet', 'Minutes of Meeting', 'Masterlist (Meeting)',
        'BAC Resolution', 'Abstract of Quotation', 'Notice of Award', 'Contract/PO', 'Notice to Proceed', 'OSS', 'Sec. Cert / SPA',
        'PhilGEPS Posting (Award)', 'Certificate of Posting (Award)'
    ]

    LEASE_REQUIREMENTS = [
        'Purchase Request', 'PPMP', 'APP',
        'Non-Avail (DILG)', 'Non-Avail (Gov)', 'Cost Benefit Analysis', 'Justification (Private Venue)',
        'Notice of BAC Meeting', 'Invitation to COA', 'Attendance Sheet', 'Minutes of Meeting', 'Masterlist (Meeting)',
        'BAC Resolution', 'Abstract of Quotation', 'Rating Factor', 'Notice of Award', 'Lease Agreement', 'Notice to Proceed', 'OSS', 'Sec. Cert / SPA',
        'PhilGEPS Posting (Award)', 'Certificate of Posting (Award)'
    ]

    REQUIREMENTS_MAPPING = {
        'small_value': DEFAULT_REQUIREMENTS,
        'public_bidding': DEFAULT_REQUIREMENTS,
        'negotiated': DEFAULT_REQUIREMENTS,
        'lease_of_venue': LEASE_REQUIREMENTS
    }

    @staticmethod
    def _document_has_uploaded_or_generated_file(document):
        return bool(document.file) or (document.subDoc or '').strip() == 'Purchase Request'

    @staticmethod
    def _folder_is_completed(documents):
        docs = list(documents)
        return bool(docs) and all(DashboardService._document_has_uploaded_or_generated_file(doc) for doc in docs)

    @staticmethod
    def get_folder_stats():
        """
        Count dashboard progress by procurement folder/PPMP group, not by document row.
        A folder is completed when every document currently in that folder has a file,
        with Purchase Request counted as the system-generated file.
        """
        seen_document_ids = set()
        total = 0
        complete = 0
        ongoing = 0

        for record in ProcurementRecord.objects.prefetch_related('documents').all():
            docs = list(record.documents.all())
            if not docs:
                continue
            total += 1
            seen_document_ids.update(doc.id for doc in docs)
            if DashboardService._folder_is_completed(docs):
                complete += 1
            else:
                ongoing += 1

        orphan_docs = Document.objects.filter(procurement_record__isnull=True).exclude(id__in=seen_document_ids)
        groups = {}
        for doc in orphan_docs:
            key = (doc.ppmp_no or doc.prNo or str(doc.id)).strip()
            groups.setdefault(key, []).append(doc)

        for docs in groups.values():
            total += 1
            if DashboardService._folder_is_completed(docs):
                complete += 1
            else:
                ongoing += 1

        return {
            'total': total,
            'complete': complete,
            'ongoing': ongoing,
            'pending': 0,
        }

    @staticmethod
    def get_category_breakdown():
        return Document.objects.values('category').annotate(count=Count('id')).order_by('-count')

    @staticmethod
    def get_pending_breakdown():
        """
        Identify missing documents for each ProcurementRecord based on its type.
        Logic: DEFAULT (SVP, PB, NEG) vs LEASE_OF_VENUE
        """
        records = ProcurementRecord.objects.all().order_by('-created_at')
        breakdown = []

        for record in records:
            p_type = record.procurement_type or 'small_value'
            required_docs = DashboardService.REQUIREMENTS_MAPPING.get(p_type, DashboardService.DEFAULT_REQUIREMENTS)
            
            # Use subDoc as the key for matching
            uploaded_docs = set(Document.objects.filter(procurement_record=record).values_list('subDoc', flat=True))
            
            missing_docs = [doc for doc in required_docs if doc not in uploaded_docs]
            
            if missing_docs:
                breakdown.append({
                    'prNo': record.pr_no,
                    'procurementMethod': record.get_procurement_type_display(),
                    'missingCount': len(missing_docs),
                    'missingSubDocs': missing_docs
                })
        
        return breakdown

    @staticmethod
    def get_monthly_trend():
        from django.db.models.functions import ExtractMonth, ExtractYear
        return Document.objects.annotate(
            trend_year=ExtractYear('uploaded_at'),
            trend_month=ExtractMonth('uploaded_at')
        ).values('trend_year', 'trend_month').annotate(count=Count('id')).order_by('trend_year', 'trend_month')

    @staticmethod
    def get_dashboard_data(uploaded_by='', is_admin=False):
        """
        Aggregate all dashboard statistics into a single response matching frontend expectations.
        Expected keys: pieData, totalDocumentsUploaded, calendarEvents, procurementMethodCounts, pendingBreakdown
        """
        from api.models import CalendarEvent, ProcurementRecord
        from django.utils import timezone
        
        # 1. Base stats for the Progress Ring / stat cards.
        # These are folder/PPMP counts, not individual document counts.
        stats = DashboardService.get_folder_stats()
        pieData = [
            stats.get('total', 0),
            stats.get('complete', 0),
            stats.get('ongoing', 0),
            stats.get('pending', 0)
        ]
        
        # 2. Total folders represented in the progress cards
        totalDocumentsUploaded = stats.get('total', 0)

        # 3. Calendar Events (Next 30 days or all upcoming)
        events = CalendarEvent.objects.filter(date__gte=timezone.now().date()).order_by('date')[:10]
        calendarEvents = [
            {
                'id': str(event.id),
                'title': event.title,
                'date': event.date.isoformat() if event.date else None
            }
            for event in events
        ]

        # 4. Procurement Method Counts (For charts)
        method_counts_raw = ProcurementRecord.objects.values('procurement_type').annotate(count=Count('id'))
        
        # Map DB values to display names expected by UI
        type_mapping = {
            'lease_of_venue': 'Lease of Venue',
            'small_value': 'Small Value Procurement',
            'public_bidding': 'Public Bidding',
            'negotiated': 'Negotiated Procurement'
        }
        
        procurementMethodCounts = {
            'Lease of Venue': 0,
            'Small Value Procurement': 0,
            'Public Bidding': 0,
            'Negotiated Procurement': 0
        }
        
        for item in method_counts_raw:
            p_type = item.get('procurement_type')
            display_name = type_mapping.get(p_type)
            if display_name:
                procurementMethodCounts[display_name] = item.get('count', 0)

        # 5. Pending Breakdown
        pendingBreakdown = DashboardService.get_pending_breakdown()

        # 6. Monthly Trend (Bonus - used in some versions of UI)
        raw_trend = DashboardService.get_monthly_trend()
        monthly_trend = []
        for item in raw_trend:
            y = item.get('trend_year')
            m = item.get('trend_month')
            if y and m:
                monthly_trend.append({
                    'month': f"{y}-{m:02d}",
                    'count': item.get('count', 0)
                })

        return {
            'pieData': pieData,
            'totalDocumentsUploaded': totalDocumentsUploaded,
            'calendarEvents': calendarEvents,
            'procurementMethodCounts': procurementMethodCounts,
            'pendingBreakdown': pendingBreakdown,
            'monthlyTrend': monthly_trend
        }


