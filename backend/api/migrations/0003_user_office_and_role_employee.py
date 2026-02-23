# Generated manually for role admin/employee and office field

from django.db import migrations, models


def staff_to_employee(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(role='staff').update(role='employee')


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_add_report_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='office',
            field=models.CharField(blank=True, help_text='Office or department', max_length=255),
        ),
        migrations.RunPython(staff_to_employee, migrations.RunPython.noop),
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
