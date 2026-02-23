import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import User

# Create superuser if it doesn't exist (email='' for compatibility)
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser(
        username='admin',
        email='',
        password='admin123',
        role='admin',
        fullName='Administrator',
    )
    print('Superuser created: username=admin, password=admin123')
else:
    print('Superuser already exists.')
