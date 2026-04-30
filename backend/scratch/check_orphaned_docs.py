import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import Document, PurchaseRequest

print("--- Purchase Request Documents without Models ---")
pr_docs = Document.objects.filter(subDoc='Purchase Request')
for doc in pr_docs:
    has_model = PurchaseRequest.objects.filter(ppmp=doc.procurement_record).exists()
    print(f"Doc: {doc.title}, PR No: {doc.user_pr_no}, Has Model: {has_model}, Folder: {doc.procurement_record.pr_no if doc.procurement_record else 'None'}")
