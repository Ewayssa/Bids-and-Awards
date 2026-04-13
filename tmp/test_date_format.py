import os
import django
import sys

# Add the project root to sys.path
sys.path.append('c:/Users/elyss/OneDrive/Documents/GitHub/Bids-and-Awards/backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.serializers import DocumentSerializer
from rest_framework import serializers

def test_date_parsing(date_str):
    print(f"--- Testing date: {date_str!r} ---")
    data = {
        'title': 'Test Document',
        'category': 'General',
        'subDoc': 'N/A',
        'date': date_str,
        'uploadedBy': 'testuser'
    }
    serializer = DocumentSerializer(data=data)
    is_valid = serializer.is_valid()
    if is_valid:
        print(f"  Valid! Final value: {serializer.validated_data.get('date')}")
    else:
        print(f"  Invalid! Errors: {dict(serializer.errors)}")
    return is_valid

# Test the specific format that was reported as failing
dates_to_test = [
    '04-13-26',     # MM-DD-YY (2-digit year)
    '2026-04-13',   # YYYY-MM-DD
    '04-13-2026',   # MM-DD-YYYY
    '04/13/26',     # MM/DD/YY
    '',             # Empty string
]

for d in dates_to_test:
    test_date_parsing(d)

print("\n--- Field Info ---")
field = DocumentSerializer().fields['date']
print(f"Field: {field}")
print(f"Input formats: {field.input_formats}")
