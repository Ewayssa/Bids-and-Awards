from django.utils import timezone
from django.db.models import Max
from api.models import ProcurementRecord
import json
import datetime
from .document_status import DocumentStatusCalculator

def get_next_transaction_number(date=None):
    """
    Generate a unique sequence number in format: YYYY-00M-MM-NNNN.
    Example: 2026-004-04-0001
    """
    try:
        if date is None:
            now = timezone.now()
            year = now.year
            month = now.month
        else:
            if hasattr(date, 'year') and hasattr(date, 'month'):
                year = date.year
                month = date.month
            else:
                s = str(date).strip()[:10]
                if not s or s.count('-') < 2:
                    now = timezone.now()
                    year = now.year
                    month = now.month
                else:
                    parts = s.split('-')
                    if len(parts) >= 3:
                        if len(parts[0]) == 4:
                            year = int(parts[0])
                            month = int(parts[1])
                        elif len(parts[2]) == 2:
                            year = int(f"20{parts[2]}")
                            month = int(parts[0])
                        else:
                            now = timezone.now()
                            year = now.year
                            month = now.month
                    else:
                        now = timezone.now()
                        year = now.year
                        month = now.month

        # Consistent prefix for lookup
        prefix = f"{year}-{month:02d}-{month:02d}"
        
        # Find the highest existing sequence number for this prefix to avoid collisions
        last_record = ProcurementRecord.objects.filter(pr_no__startswith=prefix).aggregate(Max('pr_no'))['pr_no__max']
        
        if last_record:
            try:
                # Extract the last 4 digits after the last hyphen
                seq_str = last_record.split('-')[-1]
                next_sequence = int(seq_str) + 1
            except (ValueError, IndexError):
                # Fallback to count if format is weird
                next_sequence = ProcurementRecord.objects.filter(pr_no__startswith=prefix).count() + 1
        else:
            next_sequence = 1
            
        final_no = f"{prefix}-{next_sequence:04d}"
        
        # Final safety check for uniqueness
        while ProcurementRecord.objects.filter(pr_no=final_no).exists():
            next_sequence += 1
            final_no = f"{prefix}-{next_sequence:04d}"
            
        return final_no
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
