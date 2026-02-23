# Simplify to two roles: admin and employee only

from django.db import migrations, models


def migrate_roles_to_admin_employee(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(role='administrator').update(role='admin')
    User.objects.exclude(role='admin').update(role='employee')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_notification'),
    ]

    operations = [
        migrations.RunPython(migrate_roles_to_admin_employee, noop_reverse),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('admin', 'Admin'), ('employee', 'Employee')],
                default='employee',
                max_length=10,
            ),
        ),
    ]
