from rest_framework import serializers
from ..models import CalendarEvent, Notification, AuditLog

class CalendarEventSerializer(serializers.ModelSerializer):
    date = serializers.DateField(input_formats=['%m-%d-%y', '%m-%d-%Y', '%m/%d/%y', '%m/%d/%Y', '%Y-%m-%d', 'iso-8601'])

    class Meta:
        model = CalendarEvent
        fields = ('id', 'title', 'date')
        
    def validate_date(self, value):
        """Require date; normalize datetime to date."""
        if value is None or value == '':
            raise serializers.ValidationError('Date is required.')
        if hasattr(value, 'date') and callable(getattr(value, 'date', None)):
            return value.date()
        return value

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'message', 'created_at', 'read', 'link', 'recipient_role', 'recipient', 'admin_only')

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ('id', 'action', 'actor', 'target_type', 'target_id', 'description', 'created_at')
        read_only_fields = fields
