
import os
import django
import sys
from rest_framework import serializers

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.serializers.document import DocumentSerializer
from api.models import Document, ProcurementRecord
from django.core.files.uploadedfile import SimpleUploadedFile

def test_document_create():
    # Simulate data from UploadPPMPModal
    file = SimpleUploadedFile("test.pdf", b"pdf content", content_type="application/pdf")
    data = {
        'category': 'Initial Documents',
        'subDoc': 'Project Procurement Management Plan/Supplemental PPMP',
        'title': 'Test PPMP 2026',
        'ppmp_no': 'PPMP-TEST-002',
        'year': '2026',
        'quarter': 'Q1',
        'uploadedBy': 'Admin',
        'file': file
    }
    
    serializer = DocumentSerializer(data=data)
    if serializer.is_valid():
        print("Serializer is valid")
        try:
            doc = serializer.save()
            print(f"Document created: {doc.id}")
            print(f"Linked PR No: {doc.prNo.pr_no if doc.prNo else 'None'}")
        except Exception as e:
            import traceback
            traceback.print_exc()
    else:
        print(f"Serializer errors: {serializer.errors}")

if __name__ == "__main__":
    test_document_create()
