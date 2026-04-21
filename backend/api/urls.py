from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'procurement-records', views.ProcurementRecordViewSet)
router.register(r'procurement-stage-statuses', views.ProcurementStageStatusViewSet)
router.register(r'upload', views.DocumentViewSet, basename='upload')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'calendar-events', views.CalendarEventViewSet, basename='calendar-event')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'audit-log', views.AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('login/', views.login),
    path('register/', views.register),
    path('change-password/', views.change_password),
    path('forgot-password/', views.forgot_password),
    path('update-profile/', views.update_profile),
    path('dashboard/', views.get_dashboard_data),
    path('me/', views.get_my_profile),
    path('next-transaction-number/', views.next_transaction_number),
    path('uploaded-documents/', views.DocumentViewSet.as_view({'get': 'list'})),
    path('', include(router.urls)),
]
