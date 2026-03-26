import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
import django
django.setup()

from api.services.dashboard_service import DashboardService
from api.models import Document
from api.utils.document_status import DocumentStatusCalculator

print('Dashboard data:', DashboardService.get_dashboard_data())
print('Pending slots:', DashboardService.get_checklist_global_pending(Document.objects.all()))
print('CHECKLIST_DOC_TYPES len:', len(DocumentStatusCalculator.CHECKLIST_DOC_TYPES))
print('Num Documents:', Document.objects.count())


