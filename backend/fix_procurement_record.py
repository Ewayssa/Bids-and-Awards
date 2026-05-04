import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from django.db import connection

queries = [
    "ALTER TABLE api_procurementrecord ADD COLUMN rfq_no VARCHAR(100) NOT NULL DEFAULT ''",
    "ALTER TABLE api_procurementrecord ADD COLUMN end_user_office VARCHAR(255) NOT NULL DEFAULT ''",
    "ALTER TABLE api_procurementrecord ADD COLUMN remarks LONGTEXT NOT NULL",
    "ALTER TABLE api_procurementrecord ADD COLUMN created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)"
]

try:
    with connection.cursor() as cur:
        for q in queries:
            try:
                cur.execute(q)
                print(f"Executed: {q}")
            except Exception as e:
                print(f"Skipped/Error on {q}: {e}")
        print('Columns added successfully.')
except Exception as e:
    print('Global Error:', e)
