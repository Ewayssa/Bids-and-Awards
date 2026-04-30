import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import User

print("--- All Users ---")
for user in User.objects.all():
    print(f"Username: {user.username}, Role: {user.role}, Full Name: {user.fullName}")
