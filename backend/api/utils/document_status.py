"""
Document status calculation utilities.
Handles the complex logic for determining document completeness status.
"""

import json
from typing import Dict, Any, Optional
from django.utils import timezone


class DocumentStatusCalculator:
    """Calculates document status based on sub-document type requirements."""

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
        'Purchase Request',
        'Notice of Award (Posted)',
        'Abstract of Quotation (Posted)',
        'BAC Resolution (Posted)',
    }

    @staticmethod
    def _is_filled(val):
        """Helper to check if a field value is present and not empty."""
        if val is None: return False
        if isinstance(val, str): return bool(val.strip())
        # For numbers, 0 can be a valid value, but for this system's logic,
        # we often expect non-zero amounts. This can be adjusted if needed.
        if isinstance(val, (int, float)): return True
        return True

    # A mapping of sub-document types to their required fields for 'complete' status.
    # Updated with official BAC checklist names.
    REQUIRED_FIELDS_BY_SUBDOC = {
        'Purchase Request': ['total_amount'],
        'Project Procurement Management Plan/Supplemental PPMP': ['ppmp_no'],
        'Annual Procurement Plan': lambda doc, is_filled: (
            is_filled(doc.app_type) and
            (not doc.certified_true_copy or is_filled(doc.certified_signed_by))
        ),
        'Market Scoping / Canvass': ['market_budget', 'market_expected_delivery', 'market_service_provider_1', 'market_service_provider_2', 'market_service_provider_3'],
        'BAC Resolution': ['resolution_no', 'winning_bidder', 'resolution_option', 'venue'],
        'Abstract of Quotation': lambda doc, is_filled: (
            is_filled(doc.aoq_no) and len(json.loads(doc.abstract_bidders or '[]')) >= 3
        ),
        'Table of Rating Factor (for Lease of Venue)': ['table_rating_service_provider', 'table_rating_address', 'table_rating_factor_value'],
        'Notice of Award': ['notice_award_service_provider', 'notice_award_authorized_rep', 'notice_award_conforme'],
        'Contract of Services/Purchase Order': ['contract_amount', 'total_amount', 'notarized_place', 'notarized_date'],
        'Contract': ['contract_amount', 'total_amount', 'notarized_place', 'notarized_date'],
        'Notice to Proceed': ['ntp_service_provider', 'ntp_authorized_rep', 'ntp_received_by'],
        'Omnibus Sworn Statement': ['oss_service_provider', 'oss_authorized_rep'],
        'OSS': ['oss_service_provider', 'oss_authorized_rep'],
    }

    @classmethod
    def is_new_procurement(cls, document) -> bool:
        """Check if document is new procurement (Procurement category, recent/empty prNo)."""
        category = (document.category or '').strip()
        is_proc_type = category == 'Procurement'
        if not is_proc_type:
            return False
        pr_no = (document.prNo or '').strip()
        if not pr_no:
            return True
        try:
            current_ym = timezone.now().date().strftime('%Y-%m')
            return pr_no.startswith(current_ym + '-')
        except Exception:
            return True  # fallback if date issues

    @classmethod
    def calculate_status(cls, document) -> str:
        """Calculate document status based on submission requirements."""
        sub_doc = (document.subDoc or '').strip()

        if cls._has_uploaded_or_generated_file(document, sub_doc):
            return 'complete'

        # 1. Individual Completeness Check
        id_complete = True
        ignore_prno = cls.is_new_procurement(document)
        
        if not cls._has_basic_fields(document, ignore_prno=ignore_prno):
            id_complete = False
        elif not cls._has_subdoc_specific_fields(document, sub_doc):
            id_complete = False
        elif not cls._has_required_file(document, sub_doc):
            id_complete = False

        if id_complete:
            return 'complete'

        # 2. Partial Submission Check
        actual_has_file = bool(document.file)
        if actual_has_file and hasattr(document.file, 'name'):
            actual_has_file = bool(document.file.name and str(document.file.name).strip())

        if actual_has_file or cls._has_any_subdoc_data(document, sub_doc):
            return 'ongoing'

        return 'pending'

    @classmethod
    def _has_uploaded_or_generated_file(cls, document, sub_doc: str) -> bool:
        """File-first completion rule for user-facing document status."""
        if sub_doc == 'Purchase Request':
            return bool(
                document.file or
                document.pr_items or
                document.total_amount or
                document.title or
                document.ppmp_no
            )

        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())

        return has_file

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
        """Check sub-document specific field requirements for completion using a mapping."""
        requirements = cls.REQUIRED_FIELDS_BY_SUBDOC.get(sub_doc)
        if not requirements:
            return True  # No specific fields required for this sub_doc

        if callable(requirements):
            try:
                # Pass the document and the helper method to the lambda
                return requirements(document, cls._is_filled)
            except (json.JSONDecodeError, TypeError):
                return False
        
        if isinstance(requirements, list):
            # Check if all fields in the list are filled
            return all(cls._is_filled(getattr(document, field, None)) for field in requirements)

        return True # Should not be reached if config is correct, but safe default

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
