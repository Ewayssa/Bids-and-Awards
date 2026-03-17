import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from ..models import User, Document, Report, CalendarEvent

class BackupService:
    @classmethod
    def export_data(cls):
        """
        Serialize all important system metadata for export.
        """
        events = [
            {'id': str(e.id), 'title': e.title, 'date': e.date.isoformat()}
            for e in CalendarEvent.objects.all().order_by('-created_at')
        ]
        users = [
            {
                'id': u.id, 
                'username': u.username, 
                'role': u.role, 
                'fullName': u.fullName or '', 
                'position': getattr(u, 'position', '') or '', 
                'office': u.office or '', 
                'is_active': u.is_active
            }
            for u in User.objects.all()
        ]
        docs = [cls._serialize_doc(d) for d in Document.objects.all().order_by('-uploaded_at')]
        reports = [cls._serialize_report(r) for r in Report.objects.all().order_by('-uploaded_at')]

        return {
            'backupVersion': 1,
            'createdAt': timezone.now().isoformat(),
            'description': 'BAC records backup: events, users, document and report metadata (no file contents).',
            'calendarEvents': events,
            'users': users,
            'documents': docs,
            'reports': reports,
        }

    @classmethod
    def restore_data(cls, data):
        """
        Restore system metadata from a backup dictionary.
        """
        restored = {'calendarEvents': 0, 'users': 0, 'documents': 0, 'reports': 0}

        # Calendar Events
        if 'calendarEvents' in data and isinstance(data['calendarEvents'], list):
            CalendarEvent.objects.all().delete()
            for e in data['calendarEvents']:
                date_val = cls._parse_date(e.get('date'))
                if date_val:
                    CalendarEvent.objects.create(title=e.get('title', ''), date=date_val)
                    restored['calendarEvents'] += 1

        # Users
        if 'users' in data and isinstance(data['users'], list):
            for u in data['users']:
                uid = u.get('id')
                if uid:
                    try:
                        user = User.objects.get(pk=uid)
                        if 'is_active' in u: user.is_active = bool(u['is_active'])
                        if 'role' in u: user.role = u['role']
                        if 'fullName' in u: user.fullName = u['fullName'] or ''
                        if 'position' in u: user.position = u.get('position') or ''
                        if 'office' in u: user.office = u['office'] or ''
                        user.save()
                        restored['users'] += 1
                    except User.DoesNotExist:
                        pass

        # Documents
        if 'documents' in data and isinstance(data['documents'], list):
            for d in data['documents']:
                doc_id = d.get('id')
                if doc_id:
                    try:
                        doc = Document.objects.get(pk=doc_id)
                        cls._update_document_metadata(doc, d)
                        doc.save()
                        restored['documents'] += 1
                    except (Document.DoesNotExist, ValueError):
                        pass

        # Reports
        if 'reports' in data and isinstance(data['reports'], list):
            for r in data['reports']:
                rid = r.get('id')
                if rid:
                    try:
                        report = Report.objects.get(pk=rid)
                        if 'title' in r: report.title = r['title'] or report.title
                        if 'submitting_office' in r: report.submitting_office = r['submitting_office'] or ''
                        if 'uploadedBy' in r: report.uploadedBy = r['uploadedBy'] or ''
                        report.save()
                        restored['reports'] += 1
                    except (Report.DoesNotExist, ValueError):
                        pass

        return restored

    @staticmethod
    def _serialize_doc(d):
        out = {'id': str(d.id)}
        meta_fields = [
            'prNo', 'title', 'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type',
            'certified_true_copy', 'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to',
            'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3',
            'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 'resolution_no',
            'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 'abstract_bidders', 'table_rating_service_provider',
            'table_rating_address', 'table_rating_factor_value', 'notice_award_service_provider', 'notice_award_authorized_rep',
            'notice_award_conforme', 'contract_received_by_coa', 'contract_amount', 'notarized_place', 'notarized_date',
            'ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep',
            'secretary_service_provider', 'secretary_owner_rep', 'uploadedBy', 'category', 'subDoc', 'status'
        ]
        for f in meta_fields:
            val = getattr(d, f, None)
            if val is None: out[f] = None
            elif isinstance(val, (str, bool)): out[f] = val
            elif hasattr(val, 'isoformat'): out[f] = val.isoformat() if val else None
            elif isinstance(val, Decimal): out[f] = str(val)
            else: out[f] = val
            
        out['uploaded_at'] = d.uploaded_at.isoformat() if d.uploaded_at else None
        out['updated_at'] = d.updated_at.isoformat() if d.updated_at else None
        out['file_name'] = d.file.name if d.file else None
        return out

    @staticmethod
    def _serialize_report(r):
        return {
            'id': str(r.id), 
            'title': r.title, 
            'submitting_office': r.submitting_office or '',
            'uploadedBy': r.uploadedBy or '', 
            'file_name': r.file.name if r.file else None,
            'uploaded_at': r.uploaded_at.isoformat() if r.uploaded_at else None
        }

    @staticmethod
    def _update_document_metadata(doc, data):
        meta_fields = [
            'title', 'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type',
            'certified_true_copy', 'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to',
            'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3',
            'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 'resolution_no',
            'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 'abstract_bidders', 'table_rating_service_provider',
            'table_rating_address', 'table_rating_factor_value', 'notice_award_service_provider', 'notice_award_authorized_rep',
            'notice_award_conforme', 'contract_received_by_coa', 'contract_amount', 'notarized_place', 'notarized_date',
            'ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep',
            'secretary_service_provider', 'secretary_owner_rep', 'uploadedBy', 'category', 'subDoc', 'status',
        ]
        for f in meta_fields:
            if f not in data: continue
            val = data[f]
            if f in ('date', 'date_received', 'notarized_date'):
                setattr(doc, f, BackupService._parse_date(val))
            elif f in ('total_amount', 'market_budget', 'contract_amount'):
                setattr(doc, f, BackupService._parse_decimal(val))
            elif f in ('contract_received_by_coa', 'certified_true_copy'):
                setattr(doc, f, bool(val) if val is not None else False)
            else:
                setattr(doc, f, val if val is not None else '')

    @staticmethod
    def _parse_date(val):
        if not val: return None
        if hasattr(val, 'year'): return val
        try: return datetime.strptime(str(val)[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError): return None

    @staticmethod
    def _parse_decimal(val):
        if val in (None, ''): return None
        try: return Decimal(str(val).replace(',', '').strip())
        except (InvalidOperation, ValueError, TypeError): return None
