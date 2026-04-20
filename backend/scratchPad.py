import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "bac_backend.settings")
django.setup()

from api.models import ProcurementRecord, Document

records = ProcurementRecord.objects.all()
if not records:
    print("No records found.")
else:
    for pr in records:
        docs = pr.documents.all()
        print(f"PR {pr.pr_no} - {pr.title} ({docs.count()} docs)")
        for doc in docs:
            print(f"  - Doc: {doc.subDoc:40} | prNo field: {doc.prNo:20} | doc.id: {doc.id}")
        print()
