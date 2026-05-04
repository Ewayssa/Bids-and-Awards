import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bac_backend.settings")
django.setup()

from api.models import ProcurementRecord, Document
from api.serializers import DocumentSerializer

# Create a test ProcurementRecord
pr = ProcurementRecord.objects.create(pr_no="TEST-1234", ppmp_no="PPMP-1234")

# Try to validate data with procurement_record
data = {
    "title": "Test Doc",
    "subDoc": "Activity Design",
    "ppmp_no": "PPMP-1234",
    "procurement_record": pr.id
}

serializer = DocumentSerializer(data=data)
if serializer.is_valid():
    print("VALID:", serializer.validated_data)
else:
    print("INVALID:", serializer.errors)
