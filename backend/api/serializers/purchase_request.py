import logging
import traceback
from django.db import transaction
from rest_framework import serializers
from ..models import PurchaseRequest, PurchaseRequestItem

logger = logging.getLogger(__name__)

class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequestItem
        fields = ['id', 'unit', 'description', 'quantity', 'unit_cost', 'total']

class PurchaseRequestSerializer(serializers.ModelSerializer):
    items = PurchaseRequestItemSerializer(many=True)
    ppmp_no = serializers.CharField(source='ppmp.ppmp_no', read_only=True)
    ppmp_title = serializers.CharField(source='ppmp.title', read_only=True)
    end_user_office = serializers.CharField(source='ppmp.end_user_office', read_only=True)
    related_documents = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'ppmp', 'ppmp_no', 'ppmp_title', 'end_user_office', 'pr_no', 'purpose', 
            'grand_total', 'status', 'created_by', 'created_at', 'updated_at', 
            'items', 'related_documents'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_related_documents(self, obj):
        if obj.ppmp:
            # Import here to avoid circular dependency
            from . import DocumentSerializer
            
            # 1. Get all linked Document model files
            related_files = list(DocumentSerializer(obj.ppmp.documents.all(), many=True).data)
            
            # 2. Get other Purchase Requests in the same folder
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

    def create(self, validated_data):
        try:
            items_data = validated_data.pop('items', [])
            
            with transaction.atomic():
                # Assign current user if not provided (viewset should handle this usually)
                pr = PurchaseRequest.objects.create(**validated_data)
                for item_data in items_data:
                    PurchaseRequestItem.objects.create(purchase_request=pr, **item_data)
                return pr
        except Exception as e:
            logger.error(f"Error creating PurchaseRequest: {str(e)}")
            logger.error(traceback.format_exc())
            # Re-raise as ValidationError so DRF returns 400 instead of 500
            raise serializers.ValidationError({"error": str(e)})

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance.pr_no = validated_data.get('pr_no', instance.pr_no)
        instance.purpose = validated_data.get('purpose', instance.purpose)
        instance.grand_total = validated_data.get('grand_total', instance.grand_total)
        instance.status = validated_data.get('status', instance.status)
        instance.ppmp = validated_data.get('ppmp', instance.ppmp)
        instance.save()

        if items_data is not None:
            # Simple approach: delete old items and create new ones
            # For a production app, you might want to sync instead
            instance.items.all().delete()
            for item_data in items_data:
                PurchaseRequestItem.objects.create(purchase_request=instance, **item_data)
        
        return instance
