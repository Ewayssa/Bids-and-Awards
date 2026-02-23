from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'upload', views.DocumentViewSet, basename='upload')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'calendar-events', views.CalendarEventViewSet, basename='calendar-event')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('login', views.login),
    path('change-password/', views.change_password),
    path('update-profile/', views.update_profile),
    path('dashboard', views.get_dashboard_data),
    path('uploaded-documents/', views.DocumentViewSet.as_view({'get': 'list'})),
    path('backup/', views.backup_data),
    path('restore/', views.restore_data),
    path('', include(router.urls)),
]
