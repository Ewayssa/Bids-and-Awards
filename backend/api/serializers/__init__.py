import re
import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.utils import timezone
from rest_framework import serializers

from ..models import User, Document, Report, CalendarEvent, Notification, AuditLog, ProcurementRecord, ProcurementStageStatus
from ..constants import DEFAULT_USER_PASSWORD
from ..utils.document_helpers import get_document_missing_count, get_next_transaction_number


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
            role='user',
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
        import secrets, string
        alphabet = string.ascii_letters + string.digits + '!@#$%'
        random_password = ''.join(secrets.choice(alphabet) for _ in range(12))
        password = validated_data.pop('password', None) or random_password
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

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(read_only=True)
    missing_count = serializers.SerializerMethodField()
    date = serializers.DateField(required=False, allow_null=True, input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])
    date_received = serializers.DateField(required=False, allow_null=True, input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])
    notarized_date = serializers.DateField(required=False, allow_null=True, input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])

    def get_status(self, obj):
        return obj.calculate_status()

    def get_missing_count(self, obj):
        return get_document_missing_count(obj)

    class Meta:
        model = Document
        fields = (
            'id', 'prNo', 'title', 'user_pr_no', 'total_amount', 'source_of_fund', 
            'ppmp_no', 'year', 'quarter', 'app_no', 'app_type', 'certified_true_copy', 'certified_signed_by', 
            'market_budget', 'market_period_from', 'market_period_to', 'market_expected_delivery', 
            'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3', 
            'office_division', 'received_by', 'date', 'date_received', 'attendance_members', 
            'resolution_no', 'winning_bidder', 'resolution_option', 'venue', 'aoq_no', 
            'abstract_bidders', 'table_rating_service_provider', 'table_rating_address', 
            'table_rating_factor_value', 'notice_award_service_provider', 
            'notice_award_authorized_rep', 'notice_award_conforme', 'contract_received_by_coa', 
            'contract_amount', 'notarized_place', 'notarized_date', 'ntp_service_provider', 
            'ntp_authorized_rep', 'ntp_received_by', 'oss_service_provider', 
            'oss_authorized_rep', 'secretary_service_provider', 'secretary_owner_rep', 
            'pr_items',
            'uploadedBy', 'category', 'subDoc', 'file', 'uploaded_at', 'updated_at', 
            'status', 'file_url', 'missing_count', 'procurement_record'
        )
        extra_kwargs = {
            'file': {'required': False},
            'prNo': {'required': False, 'allow_blank': True},
            'user_pr_no': {'required': False, 'allow_blank': True},
            'total_amount': {'required': False, 'allow_null': True},
            'source_of_fund': {'required': False, 'allow_blank': True},
            'ppmp_no': {'required': False, 'allow_blank': True},
            'year': {'required': False, 'allow_blank': True},
            'quarter': {'required': False, 'allow_blank': True},
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
            'date': {'required': False, 'allow_null': True},
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
            'pr_items': {'required': False, 'allow_blank': True},
        }

    def validate_category(self, value):
        """Ensure category has a default value if empty"""
        return value or 'General'

    def validate_subDoc(self, value):
        """Ensure subDoc has a default value if empty"""
        return value or 'N/A'


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

    def validate_pr_items(self, value):
        """Robustly handle pr_items string input."""
        if value is None:
            return ""
        if isinstance(value, (list, dict)):
            return json.dumps(value)
        return str(value)

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
        # 1. New sequence format: YYYY-MM-DD-NNNN (e.g. 2026-04-04-0001) or YYYY-00M-MM-NNNN
        # 2. Legacy format: YYYYs-MM-NNN (e.g. 2026-04-001)
        # 3. DB Legacy format: YYYY-MMM-DD (e.g. 2026-004-04)
        # 4. Simple numbers
        if (re.match(r'^\d{4}-\d{2}-\d{2}-\d{4}$', val) or 
            re.match(r'^\d{4}-\d{3}-\d{2}-\d{4}$', val) or 
            re.match(r'^\d{4}-\d{2}-\d{3}$', val) or 
            re.match(r'^\d{4}-\d{3}-\d{2}$', val) or
            val.isdigit()):
            return val
        
        raise serializers.ValidationError(f'BAC Folder No. format "{val}" is invalid.')

    def create(self, validated_data):
        # Remove status if provided (it will be auto-calculated)
        validated_data.pop('status', None)
        
        ppmp_no = validated_data.get('ppmp_no', '').strip()
        pr_no = validated_data.get('prNo', '').strip()
        doc_date = validated_data.get('date')

        # 1. Logic for grouping by PPMP No.
        if ppmp_no:
            # Try to find an existing folder for this PPMP No.
            record = ProcurementRecord.objects.filter(ppmp_no=ppmp_no).first()
            if record:
                # Use existing folder's number and link
                validated_data['prNo'] = record.pr_no
                validated_data['procurement_record'] = record
                
                # If inheritance is needed
                if not validated_data.get('year') and record.year:
                    validated_data['year'] = record.year
                if not validated_data.get('quarter') and record.quarter:
                    validated_data['quarter'] = record.quarter
            else:
                # Create a NEW folder for this PPMP No.
                if not pr_no:
                    pr_no = get_next_transaction_number(date=doc_date)
                
                # Check for existing folder with same pr_no string (non-unique now)
                # but we want to create a NEW record for this NEW ppmp_no
                record = ProcurementRecord.objects.create(
                    pr_no=pr_no,
                    ppmp_no=ppmp_no,
                    year=validated_data.get('year', ''),
                    quarter=validated_data.get('quarter', ''),
                    title=validated_data.get('title', f'Procurement for {ppmp_no}'),
                    created_by=validated_data.get('uploadedBy', 'System')
                )
                validated_data['prNo'] = pr_no
                validated_data['procurement_record'] = record
        
        # 2. Fallback for documents without PPMP No.
        if not validated_data.get('procurement_record'):
            if not pr_no:
                pr_no = get_next_transaction_number(date=doc_date)
            
            # Find or create record by pr_no if no PPMP grouping
            # (Note: pr_no is no longer unique, so we'll look for or create)
            record = ProcurementRecord.objects.filter(pr_no=pr_no, ppmp_no='').first()
            if not record:
                record = ProcurementRecord.objects.create(
                    pr_no=pr_no,
                    year=validated_data.get('year', ''),
                    quarter=validated_data.get('quarter', ''),
                    title=validated_data.get('title', 'General Procurement'),
                    created_by=validated_data.get('uploadedBy', 'System')
                )
            
            # Inheritance for non-PPMP grouping
            if not validated_data.get('year') and record.year:
                validated_data['year'] = record.year
            if not validated_data.get('quarter') and record.quarter:
                validated_data['quarter'] = record.quarter
            validated_data['prNo'] = pr_no
            validated_data['procurement_record'] = record

        instance = super().create(validated_data)
        # Status is automatically set in model's save() method and signal
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

    def validate_file(self, value):
        """Allow only PDF files for uploaded reports."""
        if not value:
            raise serializers.ValidationError('File is required.')
        name = str(getattr(value, 'name', '')).lower()
        content_type = str(getattr(value, 'content_type', '')).lower()
        if not (name.endswith('.pdf') or content_type == 'application/pdf'):
            raise serializers.ValidationError('Only PDF files are allowed for reports.')
        return value

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None


class CalendarEventSerializer(serializers.ModelSerializer):
    date = serializers.DateField(input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])

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

class ProcurementStageStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementStageStatus
        fields = '__all__'


class ProcurementRecordSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    stage_statuses = ProcurementStageStatusSerializer(many=True, read_only=True)
    procurement_type_display = serializers.CharField(source='get_procurement_type_display', read_only=True)

    class Meta:
        model = ProcurementRecord
        fields = (
            'id', 'pr_no', 'ppmp_no', 'year', 'quarter', 'user_pr_no', 'rfq_no', 'title', 'procurement_type',
            'procurement_type_display', 'mode_of_procurement', 'source_of_fund', 'total_amount',
            'end_user_office', 'current_stage', 'status', 'remarks',
            'created_by', 'created_at', 'updated_at', 'documents', 'stage_statuses'
        )
        extra_kwargs = {
            'total_amount': {'required': False, 'allow_null': True},
        }
        read_only_fields = ('created_at', 'updated_at', 'created_by')

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
