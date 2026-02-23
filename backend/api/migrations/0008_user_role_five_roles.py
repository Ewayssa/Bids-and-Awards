# Migrate User.role to 5-role system (align with frontend roles.js)

from django.db import migrations, models


def migrate_roles_to_new_system(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(role='admin').update(role='administrator')
    User.objects.filter(role='employee').update(role='end_user')
    # Any other existing values (e.g. legacy staff) -> end_user
    User.objects.exclude(role__in=['administrator', 'bac_chairperson', 'bac_member', 'bac_secretariat', 'end_user']).update(role='end_user')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_alter_user_managers'),
    ]

    operations = [
        migrations.RunPython(migrate_roles_to_new_system, noop_reverse),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('administrator', 'Administrator'),
                    ('bac_chairperson', 'BAC Chairperson'),
                    ('bac_member', 'BAC Member'),
                    ('bac_secretariat', 'BAC Secretariat / Staff'),
                    ('end_user', 'Requesting Department / End-User'),
                ],
                default='end_user',
                max_length=20,
            ),
        ),
    ]
