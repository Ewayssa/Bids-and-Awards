import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

def add_column_if_missing(table, column, definition):
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
        if not cursor.fetchone():
            print(f"Adding column {column} to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        else:
            print(f"Column {column} already exists in {table}.")

try:
    # PurchaseOrder missing fields
    add_column_if_missing('api_purchaseorder', 'tin', 'VARCHAR(100) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'place_of_delivery', 'VARCHAR(255) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'date_of_delivery', 'VARCHAR(255) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'payment_term', 'VARCHAR(100) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'amount_in_words', 'VARCHAR(500) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'fund_cluster', 'VARCHAR(100) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'funds_available', 'VARCHAR(255) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'ors_burs_no', 'VARCHAR(100) NOT NULL DEFAULT ""')
    add_column_if_missing('api_purchaseorder', 'date_of_ors_burs', 'DATE NULL')
    add_column_if_missing('api_purchaseorder', 'ors_burs_amount', 'VARCHAR(100) NOT NULL DEFAULT ""')
    
    print("Database schema fixed!")
except Exception as e:
    print(f"Error fixing schema: {e}")
