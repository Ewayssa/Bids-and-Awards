
import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from django.db import connection

def fix_data():
    with connection.cursor() as cursor:
        # 1. Update api_purchaserequest.ppmp
        cursor.execute("SELECT id, ppmp FROM api_purchaserequest WHERE ppmp IS NOT NULL")
        prs = cursor.fetchall()
        for pr_id, ppmp_val in prs:
            # Check if ppmp_val is a UUID (contains dashes and is 36 chars)
            if len(str(ppmp_val)) == 36 and '-' in str(ppmp_val):
                cursor.execute("SELECT pr_no FROM api_procurementrecord WHERE id = %s", [ppmp_val])
                res = cursor.fetchone()
                if res:
                    pr_no = res[0]
                    print(f"Updating PR {pr_id}: {ppmp_val} -> {pr_no}")
                    cursor.execute("UPDATE api_purchaserequest SET ppmp = %s WHERE id = %s", [pr_no, pr_id])

        # 2. Update api_purchaseorder.purchase_request
        cursor.execute("SELECT id, purchase_request FROM api_purchaseorder WHERE purchase_request IS NOT NULL")
        pos = cursor.fetchall()
        for po_id, pr_val in pos:
            if len(str(pr_val)) == 36 and '-' in str(pr_val):
                cursor.execute("SELECT pr_no FROM api_purchaserequest WHERE id = %s", [pr_val])
                res = cursor.fetchone()
                if res:
                    pr_no = res[0]
                    print(f"Updating PO {po_id}: {pr_val} -> {pr_no}")
                    cursor.execute("UPDATE api_purchaseorder SET purchase_request = %s WHERE id = %s", [pr_no, po_id])

if __name__ == "__main__":
    fix_data()
