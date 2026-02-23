from django.contrib import admin
from .models import User, Document, Report, CalendarEvent, Notification

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'fullName', 'role', 'office', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'fullName', 'office')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'prNo', 'category', 'subDoc', 'status', 'uploadedBy', 'uploaded_at')
    list_filter = ('status', 'category', 'uploaded_at')
    search_fields = ('title', 'prNo', 'uploadedBy')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'submitting_office', 'uploadedBy', 'uploaded_at')
    list_filter = ('uploaded_at', 'submitting_office')
    search_fields = ('title', 'submitting_office', 'uploadedBy')

@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'date', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('title',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('message', 'read', 'created_at', 'link')
    list_filter = ('read', 'created_at')
    search_fields = ('message',)
