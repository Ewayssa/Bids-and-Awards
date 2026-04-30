import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import PurchaseRequest

print("--- All Purchase Requests ---")
for pr in PurchaseRequest.objects.all():
    print(f"ID: {pr.id}, No: {pr.pr_no}, Status: {pr.status}, Folder: {pr.ppmp.pr_no if pr.ppmp else 'None'}")
