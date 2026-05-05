import re
from rest_framework import serializers
from ..models import Document, Report
from ..utils.document_helpers import get_document_missing_count, get_next_transaction_number

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(read_only=True)
    missing_count = serializers.SerializerMethodField()
    procurement_record = serializers.SerializerMethodField()
    date = serializers.DateField(required=False, allow_null=True, input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])
    ppmp_no = serializers.CharField(required=False, allow_blank=True)
    year = serializers.CharField(required=False, allow_blank=True)
    quarter = serializers.CharField(required=False, allow_blank=True)

    def get_status(self, obj):
        return obj.calculate_status()

    def get_missing_count(self, obj):
        return get_document_missing_count(obj)

    def get_procurement_record(self, obj):
        from ..models import ProcurementRecord
        record = ProcurementRecord.objects.filter(pr_no=obj.prNo).first()
        return str(record.id) if record else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Prioritize document's own fields, fallback to folder metadata
        ret['ppmp_no'] = instance.ppmp_no or ''
        ret['year'] = instance.year or ''
        ret['quarter'] = instance.quarter or ''
        
        if not ret['ppmp_no']:
            from ..models import ProcurementRecord
            record = ProcurementRecord.objects.filter(pr_no=instance.prNo).first()
            if record:
                ret['ppmp_no'] = record.ppmp_no
                ret['year'] = record.year
                ret['quarter'] = record.quarter
        return ret

    class Meta:
        model = Document
        fields = (
            'id', 'prNo', 'title', 'date',
            'uploadedBy', 'category', 'subDoc', 'file', 'uploaded_at', 'updated_at',
            'status', 'file_url', 'missing_count', 'procurement_record',
            'ppmp_no', 'year', 'quarter'
        )
        extra_kwargs = {
            'file': {'required': False},
            'prNo': {'required': False, 'allow_blank': True},
            'category': {'required': False, 'allow_blank': True},
            'subDoc': {'required': False, 'allow_blank': True},
            'date': {'required': False, 'allow_null': True},
        }

    def validate_category(self, value):
        """Ensure category has a default value if empty"""
        return value or 'General'

    def validate_subDoc(self, value):
        """Ensure subDoc has a default value if empty"""
        return value or 'N/A'

    def validate_prNo(self, value):
        """BAC Folder No.: allow empty (auto-generated on create); allow format YYYY-MM-NNN if provided."""
        if value is None or value == '':
            return value
        val = str(value).strip()
        if not val:
            return val
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

        # Get fields for ProcurementRecord, but keep them in validated_data for Document
        ppmp_no = validated_data.get('ppmp_no', '')
        year = validated_data.get('year', '')
        quarter = validated_data.get('quarter', '')

        # Auto-assign prNo if not provided
        if not validated_data.get('prNo', '').strip():
            doc_date = validated_data.get('date')
            validated_data['prNo'] = get_next_transaction_number(date=doc_date)

        # Ensure a ProcurementRecord (folder) exists for this prNo
        pr_no = validated_data.get('prNo')
        if pr_no:
            from ..models import ProcurementRecord
            record, created = ProcurementRecord.objects.get_or_create(
                pr_no=pr_no,
                defaults={
                    'ppmp_no': ppmp_no,
                    'title': validated_data.get('title', 'New Folder'),
                    'year': year,
                    'quarter': quarter,
                    'created_by': validated_data.get('uploadedBy', 'System')
                }
            )
            # If folder exists but has no ppmp_no/title/etc, update it
            if not created:
                updated = False
                if not record.ppmp_no and ppmp_no:
                    record.ppmp_no = ppmp_no
                    updated = True
                if not record.year and year:
                    record.year = year
                    updated = True
                if not record.quarter and quarter:
                    record.quarter = quarter
                    updated = True
                if record.title == 'New Folder' and validated_data.get('title'):
                    record.title = validated_data.get('title')
                    updated = True
                if updated:
                    record.save(update_fields=['ppmp_no', 'year', 'quarter', 'title'])

        return super().create(validated_data)

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

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        instance.refresh_from_db()
        return instance

    def get_file_url(self, obj):
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
