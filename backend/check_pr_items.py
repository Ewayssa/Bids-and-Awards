import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import Document

# Check last 10 Purchase Requests
prs = Document.objects.filter(subDoc='Purchase Request').order_by('-uploaded_at')[:10]

print(f"Checking {prs.count()} Purchase Requests:\n")
for pr in prs:
    print(f"ID: {pr.id}")
    print(f"Title: {pr.title}")
    print(f"PR No: {pr.user_pr_no}")
    print(f"Total Amount: {pr.total_amount}")
    print(f"PR Items Length: {len(pr.pr_items) if pr.pr_items else 0}")
    print(f"PR Items Content: {pr.pr_items[:100]}...")
    print("-" * 40)
