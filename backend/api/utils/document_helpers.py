from django.utils import timezone
from django.db.models import Max
from api.models import ProcurementRecord
import datetime
from .document_status import DocumentStatusCalculator


def get_next_transaction_number(date=None):
    """
    Generate a unique transaction number in the format YYYY-MM-DD-NNNN.
    Example: 2026-04-04-0001
    """
    try:
        if date is None:
            now = timezone.now()
            year, month, day = now.year, now.month, now.day
        else:
            if hasattr(date, 'year') and hasattr(date, 'month') and hasattr(date, 'day'):
                year, month, day = date.year, date.month, date.day
            else:
                s = str(date).strip()[:10]
                if not s or s.count('-') < 2:
                    now = timezone.now()
                    year, month, day = now.year, now.month, now.day
                else:
                    parts = s.split('-')
                    if len(parts) >= 3:
                        if len(parts[0]) == 4:
                            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                        elif len(parts[2]) == 2:
                            year = int(f"20{parts[2]}")
                            month, day = int(parts[0]), int(parts[1])
                        else:
                            now = timezone.now()
                            year, month, day = now.year, now.month, now.day
                    else:
                        now = timezone.now()
                        year, month, day = now.year, now.month, now.day

        date_prefix = f"{year}-{month:02d}-{day:02d}"
        existing_count = ProcurementRecord.objects.filter(pr_no__startswith=date_prefix).count()
        sequence = existing_count + 1
        return f"{date_prefix}-{sequence:04d}"
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error generating transaction number: {e}")
        return f"ERR-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"


def get_document_missing_count(document):
    """
    Calculate number of missing fields for a document.
    Only checks fields that exist in the database: title, date, prNo, category, subDoc, file, uploadedBy.
    """
    if not document:
        return 0

    count = 0
    sub_doc = (document.subDoc or '').strip()

    # If file already uploaded, nothing is missing
    if DocumentStatusCalculator._has_required_file_uploaded(document):
        return 0

    # Core identifying fields
    if not (document.title and str(document.title).strip()):
        count += 1
    if not document.date:
        count += 1

    ignore_prno = DocumentStatusCalculator.is_new_procurement(document)
    if not ignore_prno and not (document.prNo and str(document.prNo).strip()):
        count += 1

    if not (document.category and str(document.category).strip()):
        count += 1
    if not (document.subDoc and str(document.subDoc).strip()):
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
        'PHILGEPS - Public Bidding',
    )
    is_rfq_lease_of_venue = sub_doc.endswith(' - Lease of Venue')

    if sub_doc not in no_file_required_list and not is_rfq_lease_of_venue:
        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())
        if not has_file:
            count += 1

    if not (document.uploadedBy and str(document.uploadedBy).strip()):
        count += 1

    return count
