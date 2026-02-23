# Generated manually for audit trail

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_add_user_position'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('actor_username', models.CharField(blank=True, db_index=True, max_length=255)),
                ('action', models.CharField(db_index=True, max_length=64)),
                ('entity_type', models.CharField(db_index=True, max_length=64)),
                ('entity_id', models.CharField(blank=True, db_index=True, max_length=255)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('details', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]
