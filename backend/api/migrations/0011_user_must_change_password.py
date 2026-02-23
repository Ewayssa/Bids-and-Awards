# Add must_change_password for first-login password change requirement

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_user_role_admin_employee_only'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='must_change_password',
            field=models.BooleanField(default=False, help_text='Require user to set a new password on next login'),
        ),
    ]
