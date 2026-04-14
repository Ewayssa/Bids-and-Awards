import io
import json
import os
import zipfile
from datetime import datetime
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
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
    def create_zip_backup(cls):
        """Create an in-memory ZIP containing the database JSON and the media folder."""
        data = cls.export_data()
        json_str = json.dumps(data, indent=2)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add database JSON
            zipf.writestr('database_backup.json', json_str)
            
            # Add all files from the media root
            media_root = settings.MEDIA_ROOT
            if os.path.exists(media_root):
                for root, dirs, files in os.walk(media_root):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Maintain relative folder structure inside the ZIP
                        arcname = os.path.join('media', os.path.relpath(file_path, media_root))
                        zipf.write(file_path, arcname)

        zip_buffer.seek(0)
        return zip_buffer

    @classmethod
    def restore_zip_backup(cls, zip_file):
        """Extract the ZIP, restore media files, and parse the JSON database."""
        with zipfile.ZipFile(zip_file, 'r') as zipf:
            if 'database_backup.json' not in zipf.namelist():
                raise ValueError("Invalid backup file: database_backup.json is missing.")
            
            data = json.loads(zipf.read('database_backup.json').decode('utf-8'))
            media_root = settings.MEDIA_ROOT
            os.makedirs(media_root, exist_ok=True)
            
            for item in zipf.namelist():
                if item.startswith('media/') and not item.endswith('/'):
                    target_path = os.path.join(media_root, item[len('media/'):])
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)
                    with open(target_path, 'wb') as f:
                        f.write(zipf.read(item))

        return cls.restore_data(data)

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
                    except User.DoesNotExist:
                        user = User(id=uid, username=u.get('username', f'user_{uid}'))
                        # Set a temporary password and force a change on next login for security.
                        user.set_password('default123!')
                        user.must_change_password = True
                        
                    if 'is_active' in u: user.is_active = bool(u['is_active'])
                    if 'role' in u: user.role = u['role']
                    if 'fullName' in u: user.fullName = u['fullName'] or ''
                    if 'position' in u: user.position = u.get('position') or ''
                    if 'office' in u: user.office = u['office'] or ''
                    user.save()
                    restored['users'] += 1

        # Documents
        if 'documents' in data and isinstance(data['documents'], list):
            Document.objects.all().delete()
            for d in data['documents']:
                doc_id = d.get('id')
                if doc_id:
                    try:
                        doc = Document.objects.get(pk=doc_id)
                    except (Document.DoesNotExist, ValueError):
                        doc = Document(id=doc_id)
                        
                    cls._update_document_metadata(doc, d)
                    
                    if 'file_name' in d and d['file_name']:
                        doc.file.name = d['file_name']
                    if 'uploaded_at' in d and d['uploaded_at']:
                        doc.uploaded_at = parse_datetime(d['uploaded_at'])
                    if 'updated_at' in d and d['updated_at']:
                        doc.updated_at = parse_datetime(d['updated_at'])
                        
                    doc.save()
                    restored['documents'] += 1

        # Reports
        if 'reports' in data and isinstance(data['reports'], list):
            Report.objects.all().delete()
            for r in data['reports']:
                rid = r.get('id')
                if rid:
                    try:
                        report = Report.objects.get(pk=rid)
                    except (Report.DoesNotExist, ValueError):
                        report = Report(id=rid)
                        
                    if 'title' in r: report.title = r['title'] or report.title
                    if 'submitting_office' in r: report.submitting_office = r['submitting_office'] or ''
                    if 'uploadedBy' in r: report.uploadedBy = r['uploadedBy'] or ''
                    if 'file_name' in r and r['file_name']: 
                        report.file.name = r['file_name']
                    if 'uploaded_at' in r and r['uploaded_at']: 
                        report.uploaded_at = parse_datetime(r['uploaded_at'])
                        
                    report.save()
                    restored['reports'] += 1

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
