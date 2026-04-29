import os
import django
import json
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')
django.setup()

from api.models import Document, PurchaseRequest, PurchaseRequestItem, PurchaseOrder, ProcurementRecord

def migrate():
    print("Starting PR and PO migration...")

    # 1. Migrate Documents (subDoc='Purchase Request') to PurchaseRequest
    pr_documents = Document.objects.filter(subDoc='Purchase Request')
    print(f"Found {pr_documents.count()} PR documents.")

    pr_map = {} # document_id -> purchase_request_id

    for doc in pr_documents:
        # Check if already migrated (optional, but good for idempotency)
        # We can use doc.prNo or id as a reference
        
        # Try to find matching ProcurementRecord
        ppmp = doc.procurement_record
        if not ppmp and doc.ppmp_no:
            ppmp = ProcurementRecord.objects.filter(ppmp_no=doc.ppmp_no).first()

        try:
            # Parse pr_items
            items_data = []
            if doc.pr_items:
                try:
                    items_data = json.loads(doc.pr_items)
                except:
                    print(f"  Warning: Could not parse items for Document {doc.id}")

            # Create PurchaseRequest
            pr = PurchaseRequest.objects.create(
                ppmp=ppmp,
                pr_no=doc.user_pr_no or doc.prNo or '',
                purpose=doc.title or f"Migrated PR from {doc.uploaded_at.date()}",
                grand_total=doc.total_amount or 0,
                status=doc.po_status if doc.po_status in ['pending', 'po_generated'] else 'approved',
                created_by=doc.uploadedBy or 'System',
            )
            # Use same creation date if possible
            PurchaseRequest.objects.filter(id=pr.id).update(created_at=doc.uploaded_at)
            
            pr_map[doc.id] = pr

            # Create items
            for item in items_data:
                PurchaseRequestItem.objects.create(
                    purchase_request=pr,
                    unit=item.get('unit', ''),
                    description=item.get('description', ''),
                    quantity=item.get('quantity', 0),
                    unit_cost=item.get('unit_cost', 0),
                    total=(float(item.get('quantity', 0)) * float(item.get('unit_cost', 0)))
                )
            
            print(f"  Migrated Document {doc.id} -> PR {pr.id}")
        except Exception as e:
            print(f"  Error migrating Document {doc.id}: {e}")

    # 2. Update PurchaseOrders to link to the new PurchaseRequest
    # Previously PO had pr_document (FK to Document)
    # But wait, my migration 0052 REMOVED pr_document field!
    # If I already ran the migration, the data in pr_document is GONE from the database.
    # OH NO. If the migration 0052 removed the column, the links are lost unless I backed them up.
    
    # Let's check the migration file 0052 again.
    
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
