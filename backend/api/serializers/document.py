import re
from rest_framework import serializers
from ..models import Document, Report, ProcurementRecord
from ..utils.document_helpers import get_document_missing_count, get_next_transaction_number

class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(read_only=True)
    missing_count = serializers.SerializerMethodField()
    procurement_record = serializers.SerializerMethodField()
    date = serializers.DateField(required=False, allow_null=True, input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])
    prNo = serializers.SlugRelatedField(slug_field='pr_no', queryset=ProcurementRecord.objects.all(), required=False, allow_null=True)
    ppmp_no = serializers.CharField(required=False, allow_blank=True)
    year = serializers.CharField(required=False, allow_blank=True)
    quarter = serializers.CharField(required=False, allow_blank=True)

    def get_status(self, obj):
        return obj.calculate_status()

    def get_missing_count(self, obj):
        return get_document_missing_count(obj)

    def get_procurement_record(self, obj):
        return str(obj.prNo.id) if obj.prNo else None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Prioritize document's own fields, fallback to folder metadata
        ret['ppmp_no'] = instance.ppmp_no or ''
        ret['year'] = instance.year or ''
        ret['quarter'] = instance.quarter or ''
        ret['user_pr_no'] = ''
        
        record = instance.prNo
        if record:
            if not ret['ppmp_no']:
                ret['ppmp_no'] = record.ppmp_no
            if not ret['year']:
                ret['year'] = record.year
            if not ret['quarter']:
                ret['quarter'] = record.quarter
            ret['user_pr_no'] = record.user_pr_no or ''
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

    def validate(self, attrs):
        """
        Validate document upload:
        1. Restrict to only 6 allowed document types per procurement folder
        2. Prevent duplicate document types (subDoc) for the same procurement record (prNo),
           except for document types that explicitly allow multiple files.
        """
        # Skip validation if prNo or subDoc not provided
        pr_no = attrs.get('prNo')
        sub_doc = attrs.get('subDoc')
        
        if not pr_no or not sub_doc:
            return attrs
            
        # Get the prNo value (could be instance or string)
        if hasattr(pr_no, 'pr_no'):
            pr_no_value = pr_no.pr_no
        else:
            pr_no_value = str(pr_no).strip()
            
        if not pr_no_value:
            return attrs
            
        # Normalize subDoc for comparison
        sub_doc_normalized = str(sub_doc).strip().lower()
        
        # Define the 6 allowed document type groups for procurement folders
        # These correspond to: PPMP, APP, Activity Design, PR, RIS, Market Scoping
        allowed_doc_groups = [
            ['Activity Design'],
            ['Requisition and Issue Slip', 'RIS'],
            ['Market Scoping', 'Market Scoping / Canvass'],
            ['Project Procurement Management Plan', 'PPMP', 'Supplemental PPMP', 'Project Procurement Management Plan/Supplemental PPMP'],
            ['Annual Procurement Plan', 'APP'],
            ['Purchase Request']  # This is the PR document
        ]
        
        # Flatten the list for easy checking
        allowed_subdoc_values = [item.lower() for group in allowed_doc_groups for item in group]
        
        # Check if the subDoc is one of the allowed types
        if sub_doc_normalized not in allowed_subdoc_values:
            # Flatten the allowed list for the error message
            allowed_list = [item for group in allowed_doc_groups for item in group]
            raise serializers.ValidationError({
                'subDoc': f'Document type "{sub_doc}" is not allowed in procurement folders. '
                        f'Only these types are permitted: {", ".join(allowed_list)}.'
            })
            
        # Define document types that allow multiple files
        # Based on REQUIRED_CHECKLIST_BY_TYPE in workflow_logic.py
        multi_allowed_types = [
            'received rfqs with documentary requirements'
        ]
        
        # Check if this subDoc type allows multiples
        allows_multiples = any(
            allowed_type in sub_doc_normalized 
            for allowed_type in multi_allowed_types
        )
        
        # If duplicates are not allowed for this type, check for existing
        if not allows_multiples:
            # Exclude current instance if updating
            instance = getattr(self, 'instance', None)
            exclude_id = instance.id if instance else None
            
            # Look for existing documents with same prNo and similar subDoc
            from ..models import Document
            existing = Document.objects.filter(
                prNo__pr_no=pr_no_value
            )
            
            if exclude_id:
                existing = existing.exclude(id=exclude_id)
                
            # Check for similar subDoc (case-insensitive, normalized)
            for doc in existing:
                doc_sub_doc_normalized = str(doc.subDoc).strip().lower()
                if doc_sub_doc_normalized == sub_doc_normalized:
                    raise serializers.ValidationError({
                        'subDoc': f'A document with type "{sub_doc}" already exists for this procurement record. '
                                f'Only one document of this type is allowed per folder.'
                    })
                    
        return attrs

    def validate_prNo(self, value):
        """BAC Folder No.: allow empty (auto-generated on create); allow format YYYY-MM-NNN if provided."""
        if value is None or value == '':
            return value
            
        # If it's already a ProcurementRecord instance (from SlugRelatedField), it's valid
        if hasattr(value, 'pr_no'):
            return value
            
        val = str(value).strip()
        if not val:
            return val
            
        # Standard formats: YYYY-MM-DD-NNNN or YYYY-MM-NNN etc.
        if (re.match(r'^\d{4}-\d{2}-\d{2}-\d{4}$', val) or 
            re.match(r'^\d{4}-\d{3}-\d{2}-\d{4}$', val) or 
            re.match(r'^\d{4}-\d{2}-\d{3}$', val) or 
            re.match(r'^\d{4}-\d{3}-\d{2}$', val) or
            val.isdigit() or
            'TEST' in val.upper()): # Allow test formats
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
        pr_val = validated_data.get('prNo')
        if pr_val is None or (isinstance(pr_val, str) and not pr_val.strip()):
            doc_date = validated_data.get('date')
            pr_no_str = get_next_transaction_number(date=doc_date)
        elif hasattr(pr_val, 'pr_no'): # It's a ProcurementRecord instance
            pr_no_str = pr_val.pr_no
        else:
            pr_no_str = str(pr_val)

        # Ensure a ProcurementRecord (folder) exists for this prNo
        from ..models import ProcurementRecord
        record, created = ProcurementRecord.objects.get_or_create(
            pr_no=pr_no_str,
            defaults={
                'ppmp_no': ppmp_no,
                'title': validated_data.get('title', 'New Folder'),
                'year': year,
                'quarter': quarter,
                'created_by': validated_data.get('uploadedBy', 'System')
            }
        )
        
        # Update validated_data with the actual ProcurementRecord instance
        validated_data['prNo'] = record

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
