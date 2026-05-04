import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cur:
        cur.execute("ALTER TABLE api_user ADD COLUMN first_name VARCHAR(150) NOT NULL DEFAULT ''")
        cur.execute("ALTER TABLE api_user ADD COLUMN last_name VARCHAR(150) NOT NULL DEFAULT ''")
        print('Columns added successfully.')
except Exception as e:
    print('Error:', e)
