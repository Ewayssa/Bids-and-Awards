# Remove AuditLog model (activity log feature removed)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_audit_log'),
    ]

    operations = [
        migrations.DeleteModel(name='AuditLog'),
    ]
