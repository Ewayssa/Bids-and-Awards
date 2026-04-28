from django.utils import timezone
from django.db.models import Max
from api.models import ProcurementRecord
import json
import datetime
from .document_status import DocumentStatusCalculator

def get_next_transaction_number(date=None):
    """
    Example: 2026-04-04-0001
    """
    prefix = ""
    try:
        if date is None:
            now = timezone.now()
            year = now.year
            month = now.month
            day = now.day
        else:
            if hasattr(date, 'year') and hasattr(date, 'month') and hasattr(date, 'day'):
                year = date.year
                month = date.month
                day = date.day
            else:
                s = str(date).strip()[:10]
                if not s or s.count('-') < 2:
                    now = timezone.now()
                    year = now.year
                    month = now.month
                    day = now.day
                else:
                    parts = s.split('-')
                    if len(parts) >= 3:
                        if len(parts[0]) == 4:
                            year = int(parts[0])
                            month = int(parts[1])
                            day = int(parts[2])
                        elif len(parts[2]) == 2:
                            year = int(f"20{parts[2]}")
                            month = int(parts[0])
                            day = int(parts[1])
                        else:
                            now = timezone.now()
                            year = now.year
                            month = now.month
                            day = now.day
                    else:
                        now = timezone.now()
                        year = now.year
                        month = now.month
                        day = now.day

        # Format: YYYY-MM-DD
        date_prefix = f"{year}-{month:02d}-{day:02d}"
        
        # Count existing records for this specific day to get the next sequence
        # We look for records that start with this date prefix
        existing_count = ProcurementRecord.objects.filter(pr_no__startswith=date_prefix).count()
        sequence = existing_count + 1
        
        # Format: YYYY-MM-DD-NNNN (e.g. 2026-04-04-0001)
        prefix = f"{date_prefix}-{sequence:04d}"
        return prefix
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error generating transaction number: {e}")
        # High-res fallback with timestamp to ensure uniqueness on failure
        return f"ERR-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"

def get_document_missing_count(document):
    """
    Calculate number of missing fields based on DocumentStatusCalculator rules.
    This ensures frontend 'missing' badges are in sync with backend 'status'.
    """
    if not document:
        return 0
        
    count = 0
    sub_doc = (document.subDoc or '').strip()

    if DocumentStatusCalculator._has_uploaded_or_generated_file(document, sub_doc):
        return 0
    
    # Core identifying fields for any document
    if not (document.title and str(document.title).strip()): count += 1
    if not document.date: count += 1
    
    # Requisition and Issue Slip doesn't require prNo in some contexts, 
    # but generally it does if it belongs to a folder.
    ignore_prno = DocumentStatusCalculator.is_new_procurement(document)
    if not ignore_prno and not (document.prNo and str(document.prNo).strip()):
        count += 1
        
    if not (document.category and str(document.category).strip()): count += 1
    if not (document.subDoc and str(document.subDoc).strip()): count += 1

    # Specific metadata fields from calculator mapping
    reqs = DocumentStatusCalculator.REQUIRED_FIELDS_BY_SUBDOC.get(sub_doc)
    
    if reqs:
        if callable(reqs):
            # For complex lambda-based requirements, we check if it's currently filled.
            # If not, we increment count by 1 (estimation of "something is missing")
            if not reqs(document, DocumentStatusCalculator._is_filled):
                count += 1
        elif isinstance(reqs, list):
            for field in reqs:
                val = getattr(document, field, None)
                if not DocumentStatusCalculator._is_filled(val):
                    count += 1
                
    # File requirement check
    no_file_required_list = (
        'Purchase Request',
        'Lease of Venue',
        'Lease of Venue: Table Rating Factor',
        'Minutes of the Meeting',
        'Notice of Award (Posted)',
        'Abstract of Quotation (Posted)',
        'BAC Resolution (Posted)',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding'
    )
    is_rfq_lease_of_venue = sub_doc.endswith(' - Lease of Venue')
    
    if sub_doc not in no_file_required_list and not is_rfq_lease_of_venue:
        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())
        if not has_file:
            count += 1
            
    # Uploader field
    if not (document.uploadedBy and str(document.uploadedBy).strip()):
        count += 1
        
    return count
