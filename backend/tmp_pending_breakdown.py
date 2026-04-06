import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Document
from api.services.dashboard_service import DashboardService

qs = Document.objects.all()
docs = list(qs.filter(uploaded_at__isnull=False))
folders = {}
for d in docs:
    pr = (d.prNo or '').strip()
    if pr:
        folders.setdefault(pr, []).append(d)

total_pending = 3
for pr, folder_docs in folders.items():
    is_svp = any('Small Value Procurement' in (d.subDoc or '') for d in folder_docs)
    is_pb = any('Public Bidding' in (d.subDoc or '') for d in folder_docs)
    is_lv = any('Lease of Venue' in (d.subDoc or '') for d in folder_docs)
    
    started = {(d.subDoc or '').strip() for d in folder_docs if d.calculate_status() != 'pending'}
    missing = []
    for sub in DashboardService.REQUIRED_SUB_DOCS:
        if sub in DashboardService.SVP_ONLY and not is_svp: continue
        if sub in DashboardService.PB_ONLY and not is_pb: continue
        if sub in DashboardService.LV_ONLY and not is_lv: continue
        if sub not in started: missing.append(sub)
    
    print(f"\n--- Folder {pr} ({len(missing)} pending items) ---")
    print(", ".join(missing))
