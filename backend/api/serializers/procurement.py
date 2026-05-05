from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from rest_framework import serializers
from ..models import ProcurementRecord
from .document import DocumentSerializer
from .purchase import PurchaseRequestSerializer

class ProcurementRecordSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    purchase_requests = PurchaseRequestSerializer(many=True, read_only=True)
    procurement_type_display = serializers.CharField(source='get_procurement_type_display', read_only=True)

    class Meta:
        model = ProcurementRecord
        fields = (
            'id', 'pr_no', 'ppmp_no', 'year', 'quarter', 'user_pr_no', 'rfq_no', 'title', 'procurement_type',
            'procurement_type_display', 'mode_of_procurement', 'source_of_fund', 'total_amount',
            'end_user_office', 'status', 'remarks',
            'created_by', 'created_at', 'updated_at', 'documents', 'purchase_requests'
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
