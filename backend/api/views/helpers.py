import mimetypes
import os
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from ..models import Notification, AuditLog

def _create_notification(message, link='/procurement', recipient_role=None, recipient=None, admin_only=False):
    """
    Create an in-system notification.
    If recipient_role is set, all users with that role will see it.
    If recipient is set, only that specific user will see it.
    """
    Notification.objects.create(
        message=message, 
        link=link, 
        recipient_role=recipient_role, 
        recipient=recipient,
        admin_only=admin_only
    )

def _inline_file_response(file_field):
    """
    Return an inline file preview response while preserving the uploaded filename.
    Browsers commonly use the Content-Disposition filename as the preview tab title.
    """
    content_type, _ = mimetypes.guess_type(file_field.name)
    content_type = content_type or 'application/octet-stream'
    filename = os.path.basename(file_field.name)

    response = HttpResponse(file_field.read(), content_type=content_type)
    response['Content-Disposition'] = content_disposition_header(
        as_attachment=False,
        filename=filename,
    )
    response['X-Content-Type-Options'] = 'nosniff'
    return response

def _log_audit(action, actor='System', target_type='', target_id='', description=''):
    """Record an important action in the audit trail."""
    AuditLog.objects.create(
        action=action,
        actor=(actor or 'System').strip() or 'System',
        target_type=(target_type or '')[:64],
        target_id=str(target_id)[:64] if target_id else '',
        description=(description or '')[:500],
    )
