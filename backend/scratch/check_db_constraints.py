
import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from django.db import connection

def check_constraints():
    with connection.cursor() as cursor:
        # Get FK constraints for api_document
        cursor.execute("""
            SELECT 
                CONSTRAINT_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM 
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_NAME = 'api_document' 
                AND TABLE_SCHEMA = DATABASE() 
                AND REFERENCED_TABLE_NAME IS NOT NULL
        """)
        print("\nConstraints for api_document:")
        for row in cursor.fetchall():
            print(row)

        # Get FK constraints for api_purchaserequest
        cursor.execute("""
            SELECT 
                CONSTRAINT_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
            FROM 
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE 
                TABLE_NAME = 'api_purchaserequest' 
                AND TABLE_SCHEMA = DATABASE() 
                AND REFERENCED_TABLE_NAME IS NOT NULL
        """)
        print("\nConstraints for api_purchaserequest:")
        for row in cursor.fetchall():
            print(row)

if __name__ == "__main__":
    check_constraints()
