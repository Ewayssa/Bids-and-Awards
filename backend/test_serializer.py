import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import ProcurementRecord
from api.serializers import ProcurementRecordSerializer

prs = ProcurementRecord.objects.all()[:2]
for pr in prs:
    data = ProcurementRecordSerializer(pr).data
    pr_no = data.get("pr_no")
    title = data.get("title")
    print(f"PR: {pr_no} - {title}")
    docs = data.get("documents", [])
    print(f"Documents count: {len(docs)}")
    for doc in docs:
        sub_doc = doc.get("subDoc")
        rec_id = doc.get("procurement_record")
        print(f"  - {sub_doc} (record={rec_id})")
    print("---")
