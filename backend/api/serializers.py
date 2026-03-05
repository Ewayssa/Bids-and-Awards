import re
import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from django.utils import timezone
from rest_framework import serializers
from .models import User, Document, Report, CalendarEvent, Notification, AuditLog


def get_next_transaction_number(date=None):
    """Generate BAC Folder No. in format YYYY-MM-NNN from the given date (or today if not provided).
    NNN is the month: 001=January, 002=February, … 012=December.
    Example: date=2026-01-15 → 2026-01-001 (Jan); date=2026-02-01 → 2026-02-002 (Feb)."""
    if date is None:
        now = timezone.now()
        year_month = now.strftime('%Y-%m')
        month_num = now.month
    else:
        if hasattr(date, 'year') and hasattr(date, 'month'):
            year_month = f"{date.year}-{date.month:02d}"
            month_num = date.month
        else:
            s = str(date).strip()[:10]
            if not s or s.count('-') < 2:
                now = timezone.now()
                year_month = now.strftime('%Y-%m')
                month_num = now.month
            else:
                parts = s.split('-')
                year_month = f"{parts[0]}-{parts[1]}"
                month_num = int(parts[1]) if len(parts) > 1 else 1
    return f"{year_month}-{month_num:03d}"

# Default password for new users; they must change it on first login.
DEFAULT_USER_PASSWORD = 'password'


class RegisterSerializer(serializers.Serializer):
    """Public self-registration: creates an inactive user (admin must activate)."""
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    fullName = serializers.CharField(max_length=255, required=True, allow_blank=False)
    position = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    office = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Username is required.')
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def create(self, validated_data):
        username = validated_data['username'].strip()
        password = validated_data['password']
        full_name = (validated_data.get('fullName') or '').strip()
        position = (validated_data.get('position') or '').strip()
        office = (validated_data.get('office') or '').strip()
        email = username if '@' in username else ''
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            fullName=full_name or username,
            position=position,
            office=office,
            role='employee',
            is_active=False,
        )
        user.must_change_password = False
        user.save(update_fields=['must_change_password'])
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'fullName', 'position', 'office', 'password', 'is_active', 'must_change_password')
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'must_change_password': {'read_only': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None) or DEFAULT_USER_PASSWORD
        username = validated_data.pop('username')
        email = validated_data.pop('email', None) or ''
        # When username looks like an email, populate email field (used for password reset)
        if not email and '@' in username:
            email = username
        # Only pass model fields that create_user accepts as extra_fields
        extra = {k: v for k, v in validated_data.items() if k in ('role', 'fullName', 'position', 'office', 'is_active')}
        extra['must_change_password'] = True
        user = User.objects.create_user(username=username, email=email, password=password, **extra)
        # Store temporarily so view can include in create response (not persisted)
        user._temporary_password = password
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

def _document_missing_count(obj):
    """Count of missing required fields. Activity Design/PPMP: source_of_fund. APP: app_no, app_type, Signed by if Certified."""
    count = 0
    sub_doc_trim = (obj.subDoc or '').strip()
    # No title required for: Invitation to COA; Small Value Procurement, Public Bidding, Lease of Venue (same as fill-out form)
    _no_title_required = (
        sub_doc_trim == 'Invitation to COA'
        or sub_doc_trim == 'List of Venue'
        or sub_doc_trim.endswith(' - List of Venue')
        or sub_doc_trim == 'Lease of Venue: Table Rating Factor'
        or sub_doc_trim == 'PHILGEPS - Small Value Procurement'
        or sub_doc_trim == 'PHILGEPS - Public Bidding'
        or sub_doc_trim == 'Certificate of DILG - Small Value Procurement'
        or sub_doc_trim == 'Certificate of DILG - List of Venue'
        or sub_doc_trim == 'Certificate of DILG - Public Bidding'
        or sub_doc_trim in ('Small Value Procurement', 'Public Bidding')
    )
    if not _no_title_required and not (obj.title and str(obj.title).strip()):
        count += 1
    if not (obj.prNo and str(obj.prNo).strip()):
        count += 1
    if not (obj.category and str(obj.category).strip()):
        count += 1
    if not (obj.subDoc and str(obj.subDoc).strip()):
        count += 1
    if sub_doc_trim == 'Annual Procurement Plan':
        if not (obj.app_type and str(obj.app_type).strip()):
            count += 1
        if (obj.app_type or '').strip() == 'Updated' and not (obj.app_no and str(obj.app_no).strip()):
            count += 1
        if obj.certified_true_copy and not (obj.certified_signed_by and str(obj.certified_signed_by).strip()):
            count += 1
    elif sub_doc_trim in ('Activity Design', 'Project Procurement Management Plan/Supplemental PPMP'):
        if not (obj.source_of_fund and str(obj.source_of_fund).strip()):
            count += 1
    elif sub_doc_trim == 'Market Scopping':
        if obj.market_budget is None:
            count += 1
        if not (obj.market_period_from and str(obj.market_period_from).strip()):
            count += 1
        if not (obj.market_period_to and str(obj.market_period_to).strip()):
            count += 1
        if not (obj.market_expected_delivery and str(obj.market_expected_delivery).strip()):
            count += 1
        if not (obj.market_service_provider_1 and str(obj.market_service_provider_1).strip()):
            count += 1
        if not (obj.market_service_provider_2 and str(obj.market_service_provider_2).strip()):
            count += 1
        if not (obj.market_service_provider_3 and str(obj.market_service_provider_3).strip()):
            count += 1
    elif sub_doc_trim == 'Requisition and Issue Slip':
        if not obj.date:
            count += 1
        if not (obj.office_division and str(obj.office_division).strip()):
            count += 1
        if not (obj.received_by and str(obj.received_by).strip()):
            count += 1
    elif sub_doc_trim == 'List of Venue':
        # Philgeps List of Venue: no date, no file required
        pass
    elif sub_doc_trim.endswith(' - List of Venue'):
        # RFQ List of Venue variants: no date, no file required
        pass
    elif sub_doc_trim == 'Lease of Venue: Table Rating Factor':
        # No file required; once submitted = complete
        pass
    elif sub_doc_trim in ('Public Bidding', 'Small Value Procurement', 'PHILGEPS', 'Certificate of DILG'):
        if not obj.date:
            count += 1
    elif sub_doc_trim.endswith(' - Small Value Procurement') or sub_doc_trim.endswith(' - Public Bidding'):
        if not obj.date:
            count += 1
    elif sub_doc_trim == 'Invitation to COA':
        if not obj.date:
            count += 1
        if not obj.date_received:
            count += 1
    elif sub_doc_trim == 'Attendance Sheet':
        if not obj.date:
            count += 1
        try:
            members = json.loads(obj.attendance_members or '[]') if (obj.attendance_members or '').strip() else []
            if not (isinstance(members, list) and len(members) > 0):
                count += 1
        except (TypeError, ValueError):
            count += 1
    elif sub_doc_trim == 'BAC Resolution':
        if not (obj.resolution_no and str(obj.resolution_no).strip()):
            count += 1
        if not (obj.title and str(obj.title).strip()):
            count += 1
        if not (obj.winning_bidder and str(obj.winning_bidder).strip()):
            count += 1
        if obj.total_amount is None:
            count += 1
        if not (obj.resolution_option and str(obj.resolution_option).strip()):
            count += 1
        if not (obj.office_division and str(obj.office_division).strip()):
            count += 1
        if not obj.date:
            count += 1
        if not (obj.venue and str(obj.venue).strip()):
            count += 1
    elif sub_doc_trim == 'Abstract of Quotation':
        if not (obj.aoq_no and str(obj.aoq_no).strip()):
            count += 1
        if not obj.date:
            count += 1
        if not (obj.title and str(obj.title).strip()):
            count += 1
        try:
            bidders = json.loads(obj.abstract_bidders or '[]') if (obj.abstract_bidders or '').strip() else []
            if not (isinstance(bidders, list) and len(bidders) >= 3):
                count += 1
            else:
                for b in bidders:
                    if not (b.get('name') or str(b.get('name', '')).strip()):
                        count += 1
                        break
                    if b.get('amount') is None or str(b.get('amount', '')).strip() == '':
                        count += 1
                        break
                    if not (b.get('remarks') or str(b.get('remarks', '')).strip()):
                        count += 1
                        break
        except (TypeError, ValueError):
            count += 1
    elif sub_doc_trim == 'Lease of Venue: Table Rating Factor':
        if not (obj.table_rating_service_provider and str(obj.table_rating_service_provider).strip()):
            count += 1
        if not (obj.table_rating_address and str(obj.table_rating_address).strip()):
            count += 1
        if not (obj.table_rating_factor_value and str(obj.table_rating_factor_value).strip()):
            count += 1
    elif sub_doc_trim == 'Notice of Award':
        if not obj.date:
            count += 1
        if not (obj.notice_award_service_provider and str(obj.notice_award_service_provider).strip()):
            count += 1
        if not (obj.notice_award_authorized_rep and str(obj.notice_award_authorized_rep).strip()):
            count += 1
        if not (obj.notice_award_conforme and str(obj.notice_award_conforme).strip()):
            count += 1
    elif sub_doc_trim == 'Contract Services/Purchase Order':
        if not obj.date:
            count += 1
        if obj.contract_amount is None:
            count += 1
        if not (obj.notarized_place and str(obj.notarized_place).strip()):
            count += 1
        if not obj.notarized_date:
            count += 1
    elif sub_doc_trim == 'Notice to Proceed':
        if not obj.date:
            count += 1
        if not (obj.ntp_service_provider and str(obj.ntp_service_provider).strip()):
            count += 1
        if not (obj.ntp_authorized_rep and str(obj.ntp_authorized_rep).strip()):
            count += 1
        if not (obj.ntp_received_by and str(obj.ntp_received_by).strip()):
            count += 1
    elif sub_doc_trim == 'OSS':
        if not (obj.oss_service_provider and str(obj.oss_service_provider).strip()):
            count += 1
        if not (obj.oss_authorized_rep and str(obj.oss_authorized_rep).strip()):
            count += 1
        if not obj.date:
            count += 1
    elif sub_doc_trim == "Applicable: Secretary's Certificate and Special Power of Attorney":
        if not (obj.secretary_service_provider and str(obj.secretary_service_provider).strip()):
            count += 1
        if not (obj.secretary_owner_rep and str(obj.secretary_owner_rep).strip()):
            count += 1
        if not obj.date:
            count += 1
    elif sub_doc_trim in ('PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award'):
        if not obj.date:
            count += 1
    elif sub_doc_trim in ('Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)'):
        if not obj.date:
            count += 1
    else:
        if not obj.date:
            count += 1
    if (obj.subDoc or '').strip() != 'List of Venue' and not (obj.subDoc or '').strip().endswith(' - List of Venue') and (obj.subDoc or '').strip() != 'Lease of Venue: Table Rating Factor' and (obj.subDoc or '').strip() != 'Minutes of the Meeting' and (obj.subDoc or '').strip() not in ('Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)'):
        has_file = bool(obj.file)
        if has_file and hasattr(obj.file, 'name'):
            has_file = bool(obj.file.name and str(obj.file.name).strip())
        if not has_file:
            count += 1
    if not (obj.uploadedBy and str(obj.uploadedBy).strip()):
        count += 1
    return count


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()  # Always return calculated status
    updated_at = serializers.DateTimeField(read_only=True)
    missing_count = serializers.SerializerMethodField()

    def get_status(self, obj):
        """Always return the current calculated status (real-time)"""
        return obj.calculate_status()

    def get_missing_count(self, obj):
        return _document_missing_count(obj)

    class Meta:
        model = Document
        fields = ('id', 'prNo', 'title', 'user_pr_no', 'total_amount', 'source_of_fund', 'ppmp_no', 'app_no', 'app_type', 'certified_true_copy', 'certified_signed_by', 'market_budget', 'market_period_from', 'market_period_to', 'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3', 'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 'resolution_no', 'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 'abstract_bidders', 'table_rating_service_provider', 'table_rating_address', 'table_rating_factor_value', 'notice_award_service_provider', 'notice_award_authorized_rep', 'notice_award_conforme', 'contract_received_by_coa', 'contract_amount', 'notarized_place', 'notarized_date', 'ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 'oss_authorized_rep', 'secretary_service_provider', 'secretary_owner_rep', 'uploadedBy', 'category', 'subDoc', 'file', 'uploaded_at', 'updated_at', 'status', 'file_url', 'missing_count')
        extra_kwargs = {
            'file': {'required': False},
            'prNo': {'required': False, 'allow_blank': True},
            'user_pr_no': {'required': False, 'allow_blank': True},
            'total_amount': {'required': False, 'allow_null': True},
            'source_of_fund': {'required': False, 'allow_blank': True},
            'ppmp_no': {'required': False, 'allow_blank': True},
            'app_no': {'required': False, 'allow_blank': True},
            'app_type': {'required': False, 'allow_blank': True},
            'certified_true_copy': {'required': False},
            'certified_signed_by': {'required': False, 'allow_blank': True},
            'market_budget': {'required': False, 'allow_null': True},
            'market_period_from': {'required': False, 'allow_blank': True},
            'market_period_to': {'required': False, 'allow_blank': True},
            'market_expected_delivery': {'required': False, 'allow_blank': True},
            'market_service_provider_1': {'required': False, 'allow_blank': True},
            'market_service_provider_2': {'required': False, 'allow_blank': True},
            'market_service_provider_3': {'required': False, 'allow_blank': True},
            'office_division': {'required': False, 'allow_blank': True},
            'received_by': {'required': False, 'allow_blank': True},
            'date_received': {'required': False, 'allow_null': True},
            'attendance_members': {'required': False, 'allow_blank': True},
            'resolution_no': {'required': False, 'allow_blank': True},
            'winning_bidder': {'required': False, 'allow_blank': True},
            'resolution_option': {'required': False, 'allow_blank': True},
            'venue': {'required': False, 'allow_blank': True},
            'aoq_no': {'required': False, 'allow_blank': True},
            'abstract_bidders': {'required': False, 'allow_blank': True},
            'table_rating_service_provider': {'required': False, 'allow_blank': True},
            'table_rating_address': {'required': False, 'allow_blank': True},
            'table_rating_factor_value': {'required': False, 'allow_blank': True},
            'notice_award_service_provider': {'required': False, 'allow_blank': True},
            'notice_award_authorized_rep': {'required': False, 'allow_blank': True},
            'notice_award_conforme': {'required': False, 'allow_blank': True},
            'contract_received_by_coa': {'required': False},
            'contract_amount': {'required': False, 'allow_null': True},
            'notarized_place': {'required': False, 'allow_blank': True},
            'notarized_date': {'required': False, 'allow_null': True},
            'ntp_service_provider': {'required': False, 'allow_blank': True},
            'ntp_authorized_rep': {'required': False, 'allow_blank': True},
            'ntp_received_by': {'required': False, 'allow_blank': True},
            'oss_service_provider': {'required': False, 'allow_blank': True},
            'oss_authorized_rep': {'required': False, 'allow_blank': True},
            'secretary_service_provider': {'required': False, 'allow_blank': True},
            'secretary_owner_rep': {'required': False, 'allow_blank': True},
            'category': {'required': False, 'allow_blank': True},
            'subDoc': {'required': False, 'allow_blank': True},
        }

    def validate_category(self, value):
        """Ensure category has a default value if empty"""
        return value or 'General'

    def validate_subDoc(self, value):
        """Ensure subDoc has a default value if empty"""
        return value or 'N/A'

    def validate_date(self, value):
        """Allow empty string from form data to become None"""
        if value is None or value == '':
            return None
        return value

    def validate_date_received(self, value):
        """Allow empty string from form data to become None"""
        if value is None or value == '':
            return None
        return value

    def validate_notarized_date(self, value):
        """Allow empty string from form data to become None"""
        if value is None or value == '':
            return None
        return value

    def validate_contract_received_by_coa(self, value):
        """Accept form string 'true'/'false' for Yes/No"""
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in ('true', '1', 'yes', 'on')
        return bool(value)

    def validate_contract_amount(self, value):
        """Allow empty string from form data to become None. Strip commas; round to 2 decimal places."""
        if value is None or value == '' or (isinstance(value, str) and not str(value).strip()):
            return None
        if isinstance(value, str):
            value = value.replace(',', '').strip()
            if value == '' or value == '.':
                return None
        try:
            d = Decimal(value) if not isinstance(value, Decimal) else value
            return d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError, TypeError):
            return None

    def validate_total_amount(self, value):
        """Allow empty string from form data to become None. Strip commas; round to 2 decimal places."""
        if value is None or value == '' or (isinstance(value, str) and not str(value).strip()):
            return None
        if isinstance(value, str):
            value = value.replace(',', '').strip()
            if value == '' or value == '.':
                return None
        try:
            d = Decimal(value) if not isinstance(value, Decimal) else value
            return d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError, TypeError):
            return None

    def validate_market_budget(self, value):
        """Allow empty string from form data to become None. Strip commas; round to 2 decimal places."""
        if value is None or value == '' or (isinstance(value, str) and not str(value).strip()):
            return None
        if isinstance(value, str):
            value = value.replace(',', '').strip()
            if value == '' or value == '.':
                return None
        try:
            d = Decimal(value) if not isinstance(value, Decimal) else value
            return d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError, TypeError):
            return None

    def validate_certified_true_copy(self, value):
        """Accept form string 'true'/'false' for checkbox/radio"""
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in ('true', '1', 'yes', 'on')
        return bool(value)

    def validate_prNo(self, value):
        """BAC Folder No.: allow empty (auto-generated on create); allow format YYYY-MM-NNN if provided."""
        if value is None or value == '':
            return value
        val = str(value).strip()
        if not val:
            return val
        # Accept auto-format YYYY-MM-NNN or legacy digits-only
        if re.match(r'^\d{4}-\d{2}-\d{3}$', val):
            return val
        if val.isdigit():
            return val
        raise serializers.ValidationError('BAC Folder No. must be in format YYYY-MM-NNN or numbers only.')

    def create(self, validated_data):
        # Remove status if provided (it will be auto-calculated)
        validated_data.pop('status', None)
        # Auto-assign BAC Folder No. (prNo) from document date if blank
        if not (validated_data.get('prNo') or str(validated_data.get('prNo', '')).strip()):
            doc_date = validated_data.get('date')
            validated_data['prNo'] = get_next_transaction_number(date=doc_date)
        instance = super().create(validated_data)
        # Status is automatically set in model's save() method and signal
        # Refresh to get the latest status after signal processing
        instance.refresh_from_db()
        return instance

    def update(self, instance, validated_data):
        # Never allow changing the original uploader through updates.
        validated_data.pop('uploadedBy', None)
        # BAC Folder No. (prNo) is set on create only; do not allow changing it.
        validated_data.pop('prNo', None)

        # Don't clear file if not provided in update
        if 'file' not in validated_data or validated_data.get('file') is None:
            validated_data.pop('file', None)
        # Remove status if provided (it will be auto-calculated)
        validated_data.pop('status', None)
        
        # Update fields manually to ensure save() is called
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Save will trigger status recalculation via model's save() method
        instance.save()
        
        # Refresh from database to get updated status (after signal processes it)
        instance.refresh_from_db()
        
        return instance

    def get_file_url(self, obj):
        """
        Return a path relative to the current host (e.g. /media/...)
        so the frontend always hits whichever localhost/port it is running on.
        """
        if obj.file:
            return obj.file.url
        return None


class ReportSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ('id', 'title', 'uploaded_at', 'uploadedBy', 'submitting_office', 'file', 'file_url')

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ('id', 'title', 'date')

    def validate_date(self, value):
        """Require date; normalize datetime to date."""
        if value is None or value == '':
            raise serializers.ValidationError('Date is required.')
        if hasattr(value, 'date') and callable(getattr(value, 'date', None)):
            return value.date()
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'created_at', 'read', 'link', 'admin_only')


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ('id', 'action', 'actor', 'target_type', 'target_id', 'description', 'created_at')
        read_only_fields = fields
