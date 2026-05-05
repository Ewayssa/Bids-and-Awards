import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'bac_backend.settings'
import django
django.setup()
from django.db import connection

missing_cols = [
    ("mode_of_procurement", "VARCHAR(100) NOT NULL DEFAULT ''"),
    ("source_of_fund", "VARCHAR(255) NOT NULL DEFAULT ''"),
]

with connection.cursor() as cursor:
    cursor.execute("DESCRIBE api_procurementrecord")
    existing = {row[0] for row in cursor.fetchall()}

print("Existing columns:", sorted(existing))
print()

with connection.cursor() as cursor:
    for col_name, col_def in missing_cols:
        if col_name not in existing:
            sql = "ALTER TABLE api_procurementrecord ADD COLUMN " + col_name + " " + col_def
            cursor.execute(sql)
            print("Added: " + col_name)
        else:
            print("Already exists: " + col_name)

# Verify final state
with connection.cursor() as cursor:
    cursor.execute("DESCRIBE api_procurementrecord")
    cols = [row[0] for row in cursor.fetchall()]
    print()
    print("Final columns:", sorted(cols))
    print("mode_of_procurement present:", "mode_of_procurement" in cols)
    print("source_of_fund present:", "source_of_fund" in cols)
