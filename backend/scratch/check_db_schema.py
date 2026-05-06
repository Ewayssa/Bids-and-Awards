
import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from django.db import connection

def check_schema():
    with connection.cursor() as cursor:
        # Check api_document
        cursor.execute("DESCRIBE api_document")
        print("\nTable: api_document")
        for row in cursor.fetchall():
            print(row)
            
        # Check api_purchaserequest
        cursor.execute("DESCRIBE api_purchaserequest")
        print("\nTable: api_purchaserequest")
        for row in cursor.fetchall():
            print(row)
            
        # Check api_procurementrecord
        cursor.execute("DESCRIBE api_procurementrecord")
        print("\nTable: api_procurementrecord")
        for row in cursor.fetchall():
            print(row)

if __name__ == "__main__":
    check_schema()
