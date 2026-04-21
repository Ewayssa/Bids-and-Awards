import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import Document

print(f"{'ID':<40} | {'Title':<30} | {'PPMP':<15} | {'PR Items'}")
print("-" * 100)

docs = Document.objects.filter(subDoc__icontains='Purchase Request').order_by('-uploaded_at')[:20]
for doc in docs:
    items_len = len(doc.pr_items) if doc.pr_items else 0
    print(f"{str(doc.id):<40} | {str(doc.title)[:30]:<30} | {str(doc.ppmp_no):<15} | {items_len} chars")

print("\nDetail of last 2:")
for doc in docs[:2]:
    print(f"ID: {doc.id}")
    print(f"PR Items: {doc.pr_items}")
    print("-" * 20)
