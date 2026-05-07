import logging
import traceback
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from django.db import transaction
from rest_framework import serializers
from ..models import PurchaseRequest, PurchaseRequestItem, PurchaseOrder, ProcurementRecord

logger = logging.getLogger(__name__)

class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequestItem
        fields = ['id', 'unit', 'description', 'quantity', 'unit_cost', 'total', 'pr_no']

class PurchaseRequestSerializer(serializers.ModelSerializer):
    items = PurchaseRequestItemSerializer(many=True)
    ppmp = serializers.SlugRelatedField(slug_field='pr_no', queryset=ProcurementRecord.objects.all(), required=False, allow_null=True)
    ppmp_no = serializers.CharField(source='ppmp.ppmp_no', read_only=True)
    ppmp_title = serializers.CharField(source='ppmp.title', read_only=True)
    end_user_office = serializers.SerializerMethodField()
    related_documents = serializers.SerializerMethodField()
    folder_pr_no = serializers.CharField(source='ppmp.pr_no', read_only=True)
    is_ready = serializers.BooleanField(source='ppmp.is_ready', read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'ppmp', 'ppmp_no', 'folder_pr_no', 'ppmp_title', 'end_user_office', 'pr_no', 'purpose', 
            'grand_total', 'status', 'created_by', 'created_at', 'updated_at', 
            'items', 'related_documents', 'is_ready'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_related_documents(self, obj):
        if obj.ppmp:
            from .document import DocumentSerializer
            from ..models import Document
            related_files = list(DocumentSerializer(Document.objects.filter(prNo=obj.ppmp.pr_no), many=True).data)
            
            other_prs = obj.ppmp.purchase_requests.exclude(id=obj.id)
            for pr in other_prs:
                related_files.append({
                    'id': str(pr.id),
                    'subDoc': 'Purchase Request',
                    'title': pr.purpose,
                    'grand_total': float(pr.grand_total),
                    'pr_no': pr.pr_no,
                    'items': [
                        {
                            'description': item.description,
                            'quantity': float(item.quantity),
                            'unit_cost': float(item.unit_cost),
                            'unit': item.unit
                        } for item in pr.items.all()
                    ],
                    'created_at': pr.created_at
                })
            return related_files
        return []

    def get_end_user_office(self, obj):
        if obj.ppmp and obj.ppmp.end_user_office:
            return obj.ppmp.end_user_office
        
        from ..models import User
        if obj.created_by:
            user = User.objects.filter(fullName=obj.created_by).first() or \
                   User.objects.filter(username=obj.created_by).first()
            if user and user.office:
                return user.office
        return ''

    def create(self, validated_data):
        try:
            items_data = validated_data.pop('items', [])
            with transaction.atomic():
                pr = PurchaseRequest.objects.create(**validated_data)
                for item_data in items_data:
                    PurchaseRequestItem.objects.create(purchase_request=pr, **item_data)
                return pr
        except Exception as e:
            logger.error(f"Error creating PurchaseRequest: {str(e)}")
            logger.error(traceback.format_exc())
            raise serializers.ValidationError({"error": str(e)})

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseRequestItem.objects.create(purchase_request=instance, **item_data)
        return instance

class PurchaseOrderSerializer(serializers.ModelSerializer):
    purchase_request = serializers.SlugRelatedField(slug_field='pr_no', queryset=PurchaseRequest.objects.all(), required=False, allow_null=True)
    pr_no = serializers.CharField(source='purchase_request.pr_no', read_only=True)
    purchase_request_details = PurchaseRequestSerializer(source='purchase_request', read_only=True)
    po_date = serializers.DateField(input_formats=['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', 'iso-8601'])
    date_of_ors_burs = serializers.DateField(required=False, allow_null=True, input_formats=['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', 'iso-8601'])

    def validate_date_of_ors_burs(self, value):
        if value == '' or value == 'null':
            return None
        return value

    def validate_total_amount(self, value):
        if value is None or value == '' or (isinstance(value, str) and not str(value).strip()):
            return 0
        if isinstance(value, str):
            value = value.replace(',', '').strip()
            if value == '' or value == '.':
                return 0
        try:
            d = Decimal(value) if not isinstance(value, Decimal) else value
            return d.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError, TypeError):
            return 0

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by')
