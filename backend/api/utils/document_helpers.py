from django.utils import timezone
import json
from .document_status import DocumentStatusCalculator

def get_next_transaction_number(date=None):
    """
    Generate BAC Folder No. in format YYYY-MM-NNN from the given date (or today if not provided).
    NNN is the sequence number for the month (1-based index).
    Example: 2026-01-15 -> 2026-01-001
    """
    if date is None:
        now = timezone.now()
        year_month = now.strftime('%Y-%m')
        month_num = now.month
    else:
        # Check if it's a date/datetime object
        if hasattr(date, 'year') and hasattr(date, 'month'):
            year_month = f"{date.year}-{date.month:02d}"
            month_num = date.month
        else:
            # Assume it's a string YYYY-MM-DD
            s = str(date).strip()[:10]
            if not s or s.count('-') < 2:
                now = timezone.now()
                year_month = now.strftime('%Y-%m')
                month_num = now.month
            else:
                parts = s.split('-')
                if len(parts) >= 3:
                    if len(parts[0]) == 4: # YYYY-MM-DD
                        year_month = f"{parts[0]}-{parts[1]}"
                        month_num = int(parts[1])
                    elif len(parts[2]) == 2: # MM-DD-YY
                        year = f"20{parts[2]}"
                        year_month = f"{year}-{parts[0]}"
                        month_num = int(parts[0])
                    else:
                        now = timezone.now()
                        year_month = now.strftime('%Y-%m')
                        month_num = now.month
                else:
                    now = timezone.now()
                    year_month = now.strftime('%Y-%m')
                    month_num = now.month
                
    return f"{year_month}-{month_num:03d}"


def get_document_missing_count(document):
    """
    Count of missing required fields for a document.
    Logic extracted from serializers to improve modularity.
    """
    count = 0
    sub_doc_trim = (document.subDoc or '').strip()
    
    # Define document types that don't require a title
    no_title_required_types = (
        'Invitation to COA',
        'Lease of Venue',
        'Lease of Venue: Table Rating Factor',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding',
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - Lease of Venue',
        'Certificate of DILG - Public Bidding',
        'Small Value Procurement',
        'Public Bidding'
    )
    
    _no_title_required = (
        sub_doc_trim in no_title_required_types 
        or sub_doc_trim.endswith(' - Lease of Venue')
    )
    
    # Core identifying fields
    ignore_prno = DocumentStatusCalculator.is_new_procurement(document)
    if not _no_title_required and not (document.title and str(document.title).strip()):
        count += 1
    if not ignore_prno and not (document.prNo and str(document.prNo).strip()):
        count += 1
    if not (document.category and str(document.category).strip()):
        count += 1
    if not (document.subDoc and str(document.subDoc).strip()):
        count += 1
        
    # Sub-document specific requirements
    if sub_doc_trim == 'Annual Procurement Plan':
        if not (document.app_type and str(document.app_type).strip()):
            count += 1
        if (document.app_type or '').strip() == 'Updated' and not (document.app_no and str(document.app_no).strip()):
            count += 1
        if document.certified_true_copy and not (document.certified_signed_by and str(document.certified_signed_by).strip()):
            count += 1
            
    elif sub_doc_trim in ('Activity Design', 'Project Procurement Management Plan/Supplemental PPMP'):
        if not (document.source_of_fund and str(document.source_of_fund).strip()):
            count += 1
            
    elif sub_doc_trim == 'Market Scopping':
        required_market_fields = [
            document.market_budget,
            document.market_period_from,
            document.market_period_to,
            document.market_expected_delivery,
            document.market_service_provider_1,
            document.market_service_provider_2,
            document.market_service_provider_3
        ]
        for field in required_market_fields:
            if field is None or (isinstance(field, str) and not field.strip()):
                count += 1
                
    elif sub_doc_trim == 'Requisition and Issue Slip':
        if not document.date:
            count += 1
        if not (document.office_division and str(document.office_division).strip()):
            count += 1
        if not (document.received_by and str(document.received_by).strip()):
            count += 1
            
    elif sub_doc_trim == 'Invitation to COA':
        if not document.date:
            count += 1
        if not document.date_received:
            count += 1
            
    elif sub_doc_trim == 'Attendance Sheet':
        if not document.date:
            count += 1
        try:
            members = json.loads(document.attendance_members or '[]') if (document.attendance_members or '').strip() else []
            if not (isinstance(members, list) and len(members) > 0):
                count += 1
        except (TypeError, ValueError):
            count += 1
            
    elif sub_doc_trim == 'BAC Resolution':
        required_bac_res_fields = [
            document.resolution_no,
            document.title,
            document.winning_bidder,
            document.total_amount,
            document.resolution_option,
            document.office_division,
            document.date,
            document.venue
        ]
        for field in required_bac_res_fields:
            if field is None or (isinstance(field, str) and not field.strip()):
                count += 1
                
    elif sub_doc_trim == 'Abstract of Quotation':
        if not (document.aoq_no and str(document.aoq_no).strip()):
            count += 1
        if not document.date:
            count += 1
        if not (document.title and str(document.title).strip()):
            count += 1
        try:
            bidders = json.loads(document.abstract_bidders or '[]') if (document.abstract_bidders or '').strip() else []
            if not (isinstance(bidders, list) and len(bidders) >= 3):
                count += 1
            else:
                for b in bidders:
                    if not (b.get('name') or str(b.get('name', '')).strip()) or \
                       b.get('amount') is None or str(b.get('amount', '')).strip() == '' or \
                       not (b.get('remarks') or str(b.get('remarks', '')).strip()):
                        count += 1
                        break
        except (TypeError, ValueError):
            count += 1
            
    elif sub_doc_trim == 'Lease of Venue: Table Rating Factor':
        required_lease_fields = [
            document.table_rating_service_provider,
            document.table_rating_address,
            document.table_rating_factor_value
        ]
        for field in required_lease_fields:
            if not (field and str(field).strip()):
                count += 1
                
    elif sub_doc_trim == 'Notice of Award':
        if not document.date:
            count += 1
        if not (document.notice_award_service_provider and str(document.notice_award_service_provider).strip()):
            count += 1
        if not (document.notice_award_authorized_rep and str(document.notice_award_authorized_rep).strip()):
            count += 1
        if not (document.notice_award_conforme and str(document.notice_award_conforme).strip()):
            count += 1
            
    elif sub_doc_trim == 'Contract Services/Purchase Order':
        if not document.date:
            count += 1
        if document.contract_amount is None:
            count += 1
        if not (document.notarized_place and str(document.notarized_place).strip()):
            count += 1
        if not document.notarized_date:
            count += 1
            
    elif sub_doc_trim == 'Notice to Proceed':
        if not document.date:
            count += 1
        if not (document.ntp_service_provider and str(document.ntp_service_provider).strip()):
            count += 1
        if not (document.ntp_authorized_rep and str(document.ntp_authorized_rep).strip()):
            count += 1
        if not (document.ntp_received_by and str(document.ntp_received_by).strip()):
            count += 1
            
    elif sub_doc_trim == 'OSS':
        if not (document.oss_service_provider and str(document.oss_service_provider).strip()):
            count += 1
        if not (document.oss_authorized_rep and str(document.oss_authorized_rep).strip()):
            count += 1
        if not document.date:
            count += 1
            
    elif sub_doc_trim == "Applicable: Secretary's Certificate and Special Power of Attorney":
        if not (document.secretary_service_provider and str(document.secretary_service_provider).strip()):
            count += 1
        if not (document.secretary_owner_rep and str(document.secretary_owner_rep).strip()):
            count += 1
        if not document.date:
            count += 1
            
    elif sub_doc_trim in ('PhilGEPS Posting of Award', 'Certificate of DILG R1 Website Posting of Award', 'Notice of Award (Posted)', 'Abstract of Quotation (Posted)', 'BAC Resolution (Posted)'):
        if not document.date:
            count += 1
            
    elif sub_doc_trim in ('Public Bidding', 'Small Value Procurement', 'PHILGEPS', 'Certificate of DILG'):
        if not document.date:
            count += 1
            
    elif sub_doc_trim.endswith(' - Small Value Procurement') or sub_doc_trim.endswith(' - Public Bidding'):
        if not document.date:
            count += 1
    # For many types, 'date' is a general requirement even if not listed above
    elif not document.date:
        count += 1

    # File requirement verification
    no_file_required_list = (
        'Lease of Venue',
        'Lease of Venue: Table Rating Factor',
        'Minutes of the Meeting',
        'Notice of Award (Posted)',
        'Abstract of Quotation (Posted)',
        'BAC Resolution (Posted)'
    )
    is_rfq_lease_of_venue = sub_doc_trim.endswith(' - Lease of Venue')
    
    if sub_doc_trim not in no_file_required_list and not is_rfq_lease_of_venue:
        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())
        if not has_file:
            count += 1
            
    # Uploader field
    if not (document.uploadedBy and str(document.uploadedBy).strip()):
        count += 1
        
    return count
