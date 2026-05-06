
import os
import django
import sys
import traceback

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.views.system import NotificationViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from api.models import User

def test_notifications():
    factory = APIRequestFactory()
    request = factory.get('/api/notifications/')
    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
    if not user:
        print("No user found in database")
        return
    
    force_authenticate(request, user=user)
    view = NotificationViewSet.as_view({'get': 'list'})
    try:
        response = view(request)
        print(f"STATUS: {response.status_code}")
        if response.status_code == 500:
            print("ERROR 500 returned")
        else:
            print("Success")
    except Exception:
        print("Caught exception during view execution:")
        traceback.print_exc()

if __name__ == "__main__":
    test_notifications()
