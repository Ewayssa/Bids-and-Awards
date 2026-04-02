"""
Document status calculation utilities.
Handles the complex logic for determining document completeness status.
"""

import json
from typing import Dict, Any, Optional
from django.utils import timezone


class DocumentStatusCalculator:
    """Calculates document status based on sub-document type requirements."""

    CHECKLIST_DOC_TYPES = [
        ("Procurement", [
            "Annual Procurement Plan",
            "Activity Design", 
            "Project Procurement Management Plan/Supplemental PPMP",
            "Market Scopping",
            "Requisition and Issue Slip"
        ]),
        ("Venue", [
            "Lease of Venue",
            "Invitation to COA",
            "Attendance Sheet"
        ]),
        ("Resolution", [
            "BAC Resolution"
        ]),
        ("Quotation", [
            "Abstract of Quotation"
        ]),
        ("Lease", [
            "Lease of Venue: Table Rating Factor"
        ]),
        ("Award", [
            "Notice of Award"
        ]),
        ("Contract", [
            "Contract Services/Purchase Order"
        ]),
        ("Proceed", [
            "Notice to Proceed"
        ]),
        ("OSS", [
            "OSS"
        ]),
        ("Secretary", [
            "Applicable: Secretary's Certificate and Special Power of Attorney"
        ]),
    ]

    # Sub-docs that don't require a title (remaining exceptions if any)
    NO_TITLE_REQUIRED = set()

    # Sub-docs that don't require a file upload
    NO_FILE_REQUIRED_KEYWORDS = {
        'Lease of Venue',
        'Small Value Procurement',
        'Public Bidding',
        'Minutes of the Meeting',
    }

    NO_FILE_REQUIRED_EXACT = {
        'Notice of Award (Posted)',
        'Abstract of Quotation (Posted)',
        'BAC Resolution (Posted)',
    }

    @classmethod
    def is_new_procurement(cls, document) -> bool:
        """Check if document is new procurement (Procurement category or Requisition and Issue Slip, recent/empty prNo)."""
        category = (document.category or '').strip()
        sub_doc = (document.subDoc or '').strip()
        is_proc_type = category == 'Procurement' or sub_doc == 'Requisition and Issue Slip'
        if not is_proc_type:
            return False
        pr_no = (document.prNo or '').strip()
        if not pr_no:
            return True
        try:
            current_ym = timezone.now().date().strftime('%Y-%m')
            return pr_no.startswith(current_ym + '-')
        except:
            return True  # fallback if date issues

    @classmethod
    def calculate_status(cls, document) -> str:
        """Calculate document status based on completeness requirements.

        Logic:
        - Complete: all required fields and file present.
        - Ongoing: file uploaded OR some fields filled, but not complete.
        - Pending: only basic identification fields present (no file, no specific data).
        """
        sub_doc = (document.subDoc or '').strip()

        # Check for full completeness
        is_complete = True
        ignore_prno = cls.is_new_procurement(document)
        
        if not cls._has_basic_fields(document, ignore_prno=ignore_prno):
            is_complete = False
        elif not cls._has_subdoc_specific_fields(document, sub_doc):
            is_complete = False
        elif not cls._has_required_file(document, sub_doc):
            is_complete = False

        if is_complete:
            return 'complete'

        # If not complete, check if it has started (file or partial data)
        # Check actual file existence for 'ongoing' determination
        actual_has_file = bool(document.file)
        if actual_has_file and hasattr(document.file, 'name'):
            actual_has_file = bool(document.file.name and str(document.file.name).strip())

        if actual_has_file or cls._has_any_subdoc_data(document, sub_doc):
            return 'ongoing'

        return 'pending'

    @classmethod
    def _has_any_subdoc_data(cls, document, sub_doc: str) -> bool:
        """Check if any identification or data fields have been filled.
        Used to determine if a document is 'Ongoing' (started) vs 'Pending' (not started).
        """
        # If any of the new core fields are present, it's started
        if bool(document.title and document.title.strip()):
            return True
        if bool(document.date):
            return True
        if bool(document.file):
            return True
            
        # Check for any other potentially filled fields (legacy or specific)
        # This keeps the 'ongoing' status sensitive to any data entry
        fields_to_check = [
            'app_type', 'app_no', 'certified_signed_by', 'source_of_fund', 'total_amount',
            'user_pr_no', 'ppmp_no', 'market_budget', 'office_division', 'received_by',
            'venue', 'date_received', 'resolution_no', 'winning_bidder', 'aoq_no',
            'table_rating_service_provider', 'notice_award_service_provider',
            'contract_amount', 'ntp_service_provider', 'oss_service_provider',
            'secretary_service_provider', 'secretary_owner_rep',
            'notarized_place', 'notarized_date'
        ]
        
        for field in fields_to_check:
            val = getattr(document, field, None)
            if val is not None:
                if isinstance(val, str) and val.strip() and val.strip() not in ('', '[]', 'None'):
                    return True
                if isinstance(val, (int, float)) and val != 0:
                    return True
        
        return False

    @classmethod
    def _has_basic_fields(cls, document, ignore_prno=False) -> bool:
        """Check basic required fields that apply to all documents."""
        sub_doc = (document.subDoc or '').strip()
        
        # Determine Title requirement (PHILGEPS sub-docs don't need Title)
        title_required = not sub_doc.startswith('PHILGEPS - ')
        
        # Determine Date requirement (PHILGEPS - Lease of Venue doesn't need Date)
        date_required = sub_doc != 'PHILGEPS - Lease of Venue'
        
        # Basic common core checks
        is_basic_valid = (
            (ignore_prno or bool(document.prNo and document.prNo.strip())) and
            bool(document.category and document.category.strip()) and
            bool(sub_doc) and
            bool(document.uploadedBy and document.uploadedBy.strip())
        )
        
        if not is_basic_valid:
            return False
            
        if title_required and not bool(document.title and document.title.strip()):
            return False
            
        if date_required and not bool(document.date):
            return False
            
        return True

    @classmethod
    def _has_subdoc_specific_fields(cls, document, sub_doc: str) -> bool:
        """Check sub-document specific field requirements for completion."""
        
        def is_filled(val):
            if val is None: return False
            if isinstance(val, str): return bool(val.strip())
            if isinstance(val, (int, float)): return True # even 0 might be valid for some amounts, but usually we want > 0
            return True

        # Mapping of sub-doc types to their required "details"
        if sub_doc == 'Annual Procurement Plan':
            if not is_filled(document.app_type): return False
            if document.certified_true_copy and not is_filled(document.certified_signed_by): return False
            return True
            
        if sub_doc == 'Market Scopping':
            return all([
                is_filled(document.market_budget),
                is_filled(document.market_service_provider_1),
                is_filled(document.market_service_provider_2),
                is_filled(document.market_service_provider_3)
            ])
            
        if sub_doc == 'Requisition and Issue Slip':
            return all([is_filled(document.office_division), is_filled(document.received_by)])
            
        if sub_doc == 'Invitation to COA':
            return is_filled(document.date_received)
            
        if sub_doc == 'Attendance Sheet':
            # attendance_members is a JSON string of array
            try:
                members = json.loads(document.attendance_members or '[]')
                return len(members) > 0 and any(m.get('present') for m in members)
            except:
                return False
                
        if sub_doc == 'BAC Resolution':
            return all([
                is_filled(document.resolution_no),
                is_filled(document.winning_bidder),
                is_filled(document.resolution_option),
                is_filled(document.office_division),
                is_filled(document.venue)
            ])
            
        if sub_doc == 'Abstract of Quotation':
            if not is_filled(document.aoq_no): return False
            try:
                bidders = json.loads(document.abstract_bidders or '[]')
                return len(bidders) >= 3 # User requirement: min 3 bidders
            except:
                return False
                
        if sub_doc == 'Lease of Venue: Table Rating Factor':
            return all([
                is_filled(document.table_rating_service_provider),
                is_filled(document.table_rating_address),
                is_filled(document.table_rating_factor_value)
            ])
            
        if sub_doc == 'Notice of Award':
            return all([
                is_filled(document.notice_award_service_provider),
                is_filled(document.notice_award_authorized_rep),
                is_filled(document.notice_award_conforme)
            ])
            
        if sub_doc == 'Contract Services/Purchase Order':
            return all([
                is_filled(document.contract_amount),
                is_filled(document.notarized_place),
                is_filled(document.notarized_date)
            ])
            
        if sub_doc == 'Notice to Proceed':
            return all([
                is_filled(document.ntp_service_provider),
                is_filled(document.ntp_authorized_rep),
                is_filled(document.ntp_received_by)
            ])
            
        if sub_doc == 'OSS':
            return all([is_filled(document.oss_service_provider), is_filled(document.oss_authorized_rep)])
            
        if sub_doc == "Applicable: Secretary's Certificate and Special Power of Attorney":
            return all([is_filled(document.secretary_service_provider), is_filled(document.secretary_owner_rep)])

        return True

    @classmethod
    def _has_required_file(cls, document, sub_doc: str) -> bool:
        """Check if file is required and present."""
        
        # Check if type matches any 'No File Required' keyword
        is_no_file = any(kw in sub_doc for kw in cls.NO_FILE_REQUIRED_KEYWORDS)
        if not is_no_file:
            is_no_file = sub_doc in cls.NO_FILE_REQUIRED_EXACT
            
        if is_no_file:
            return True

        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())

        return has_file

