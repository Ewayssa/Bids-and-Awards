import uuid
from django.db import models
from .user import User

class CalendarEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    reminder_sent = models.BooleanField(default=False, help_text='Has an upcoming reminder been sent for this event?')

    def __str__(self):
        return f"{self.title} ({self.date})"

class Notification(models.Model):
    """In-system notifications (no email/SMS)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)  # e.g. /encode
    
    # Target audience
    recipient_role = models.CharField(
        max_length=20, 
        choices=User.ROLE_CHOICES, 
        blank=True, 
        null=True,
        help_text='If set, only users with this role will see the notification'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text='If set, only this specific user will see the notification'
    )
    admin_only = models.BooleanField(default=False, help_text='Deprecated: Use recipient_role="admin" or "bac_secretariat" instead')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:50]

class AuditLog(models.Model):
    """Audit trail for important system actions (who did what, when)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=64, db_index=True)  # e.g. document_created, user_login
    actor = models.CharField(max_length=255, blank=True)   # username or "System"
    target_type = models.CharField(max_length=64, blank=True)  # document, user, report, etc.
    target_id = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor}: {self.action} at {self.created_at}"
