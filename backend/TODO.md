# Dashboard Charts Fix Plan

## Current Status
- Pie chart (SVG in ProcurementProgress.jsx) and bar chart (procurement types) not showing
- Likely cause: No data (all zeros), empty DB or API error

## Step 1: Check Data
**Backend server must be running** (`cd backend && python manage.py runserver`)

1. Test script executed? Copy output from VSCode terminal where you ran `python test_dashboard.py`
2. Browser Network tab: Check `/api/dashboard/` response (expect pieData array with numbers)
3. Django shell:
   ```
   cd backend
   python manage.py shell
   >>> from api.models import Document
   >>> Document.objects.count()
   >>> from api.services.dashboard_service import DashboardService
   >>> DashboardService.get_dashboard_data()
   ```

## Step 2: Frontend Debug
1. Browser console: Any errors? React dev tools: stats.pieData value?
2. Is pathname '/' ? Check useDashboard hook condition.

## Step 3: Fix No Data
If Document.objects.count() == 0:
- Upload a document via Encode page or create via shell:
  ```
  from api.models import Document
  from django.utils import timezone
  d = Document(title="Test Doc", uploaded_at=timezone.now(), uploadedBy_id=1, category="Test", subDoc="Public Bidding")
  d.save()
  ```

## Step 4: Test
- Refresh dashboard, charts should animate in with data.

Paste outputs here after Step 1!

