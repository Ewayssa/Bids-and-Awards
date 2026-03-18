"""
Document status calculation utilities.
Handles the complex logic for determining document completeness status.
"""

import json
from typing import Dict, Any, Optional
from django.utils import timezone


class DocumentStatusCalculator:
    """Calculates document status based on sub-document type requirements."""

    # Sub-docs that don't require a title
    NO_TITLE_REQUIRED = {
        'Invitation to COA',
        'List of Venue',
        'Lease of Venue: Table Rating Factor',
        'PHILGEPS - Small Value Procurement',
        'PHILGEPS - Public Bidding',
        'Certificate of DILG - Small Value Procurement',
        'Certificate of DILG - List of Venue',
        'Certificate of DILG - Public Bidding',
        'Small Value Procurement',
        'Public Bidding',
    }

    # Sub-docs that don't require a file upload
    NO_FILE_REQUIRED = {
        'List of Venue',
        'Lease of Venue: Table Rating Factor',
        'Minutes of the Meeting',
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
        """
        Calculate document status based on completeness requirements.

        Args:
            document: Document model instance

        Returns:
            str: 'ongoing' or 'complete'
        """
        sub_doc = (document.subDoc or '').strip()

        # Basic field checks for new procurement
        ignore_prno = cls.is_new_procurement(document)
        if not cls._has_basic_fields(document, ignore_prno=ignore_prno):
            return 'ongoing'

        # Sub-document specific checks
        if not cls._has_subdoc_specific_fields(document, sub_doc):
            return 'ongoing'

        # File check (if required)
        if not cls._has_required_file(document, sub_doc):
            return 'ongoing'

        return 'complete'

    @classmethod
    def _has_basic_fields(cls, document, ignore_prno=False) -> bool:
        """Check basic required fields that apply to all documents.
        ignore_prno: Skip prNo check for new procurements."""
        # Title check (with exceptions)
        sub_doc = (document.subDoc or '').strip()
        no_title_required = any(sub_doc == item or sub_doc.endswith(f' - {item}') for item in ['List of Venue']) or sub_doc in cls.NO_TITLE_REQUIRED
        has_title = (bool(document.title and document.title.strip()) if not no_title_required else True)

        prno_ok = ignore_prno or bool(document.prNo and document.prNo.strip())
        return (
            has_title and
            prno_ok and
            bool(document.category and document.category.strip()) and
            bool(sub_doc) and
            bool(document.uploadedBy and document.uploadedBy.strip())
        )

    @classmethod
    def _has_subdoc_specific_fields(cls, document, sub_doc: str) -> bool:
        """Check sub-document specific field requirements."""
        checkers = {
            'Annual Procurement Plan': cls._check_annual_procurement_plan,
            'Activity Design': cls._check_activity_design,
            'Project Procurement Management Plan/Supplemental PPMP': cls._check_ppmp,
            'Market Scopping': cls._check_market_scoping,
            'Requisition and Issue Slip': cls._check_requisition_slip,
            'List of Venue': cls._check_list_of_venue,
            'Invitation to COA': cls._check_invitation_coa,
            'Attendance Sheet': cls._check_attendance_sheet,
            'BAC Resolution': cls._check_bac_resolution,
            'Abstract of Quotation': cls._check_abstract_quotation,
            'Lease of Venue: Table Rating Factor': cls._check_lease_venue,
            'Notice of Award': cls._check_notice_award,
            'Contract Services/Purchase Order': cls._check_contract_services,
            'Notice to Proceed': cls._check_notice_proceed,
            'OSS': cls._check_oss,
            "Applicable: Secretary's Certificate and Special Power of Attorney": cls._check_secretary_certificate,
        }

        # Check RFQ variants
        if sub_doc.startswith('PHILGEPS - ') or sub_doc.startswith('Certificate of DILG - '):
            return cls._check_rfq_variant(document, sub_doc)
        elif sub_doc in ('PHILGEPS', 'Certificate of DILG'):
            return cls._check_rfq_base(document, sub_doc)

        # Use specific checker or default date check
        checker = checkers.get(sub_doc, cls._check_default_date)
        return checker(document)

    @classmethod
    def _has_required_file(cls, document, sub_doc: str) -> bool:
        """Check if file is required and present."""
        if sub_doc in cls.NO_FILE_REQUIRED or sub_doc.endswith(' - List of Venue'):
            return True

        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())

        return has_file

    # Sub-document specific checkers
    @staticmethod
    def _check_annual_procurement_plan(document) -> bool:
        has_app_type = bool(document.app_type and document.app_type.strip())
        has_app_no = has_app_type and (document.app_type.strip() != 'Updated' or bool(document.app_no and document.app_no.strip()))
        has_certified = not document.certified_true_copy or bool(document.certified_signed_by and document.certified_signed_by.strip())
        return has_app_type and has_app_no and has_certified

    @staticmethod
    def _check_activity_design(document) -> bool:
        return bool(document.source_of_fund and document.source_of_fund.strip())

    @staticmethod
    def _check_ppmp(document) -> bool:
        return bool(document.source_of_fund and document.source_of_fund.strip())

    @staticmethod
    def _check_market_scoping(document) -> bool:
        has_budget = document.market_budget is not None
        has_period = bool(document.market_period_from and document.market_period_to)
        has_expected = bool(document.market_expected_delivery)
        has_providers = all([
            document.market_service_provider_1,
            document.market_service_provider_2,
            document.market_service_provider_3
        ])
        return has_budget and has_period and has_expected and has_providers

    @staticmethod
    def _check_requisition_slip(document) -> bool:
        return (
            bool(document.date) and
            bool(document.office_division and document.office_division.strip()) and
            bool(document.received_by and document.received_by.strip())
        )

    @staticmethod
    def _check_list_of_venue(document) -> bool:
        return True  # No additional requirements

    @staticmethod
    def _check_invitation_coa(document) -> bool:
        return bool(document.date) and bool(document.date_received)

    @staticmethod
    def _check_attendance_sheet(document) -> bool:
        if not document.date:
            return False
        try:
            members = json.loads(document.attendance_members or '[]')
            return isinstance(members, list) and len(members) > 0
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _check_bac_resolution(document) -> bool:
        return (
            bool(document.resolution_no and document.resolution_no.strip()) and
            bool(document.title and document.title.strip()) and
            bool(document.winning_bidder and document.winning_bidder.strip()) and
            document.total_amount is not None and
            bool(document.resolution_option and document.resolution_option.strip()) and
            bool(document.office_division and document.office_division.strip()) and
            bool(document.date) and
            bool(document.venue and document.venue.strip())
        )

    @staticmethod
    def _check_abstract_quotation(document) -> bool:
        if not document.aoq_no or not document.date or not document.title:
            return False

        try:
            bidders = json.loads(document.abstract_bidders or '[]')
            if not isinstance(bidders, list) or len(bidders) < 3:
                return False

            def bidder_ok(b):
                return (
                    bool((b.get('name') or '').strip()) and
                    b.get('amount') is not None and
                    str(b.get('amount', '')).strip() and
                    bool((b.get('remarks') or '').strip())
                )

            return all(bidder_ok(b) for b in bidders)
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _check_lease_venue(document) -> bool:
        return True  # No additional requirements

    @staticmethod
    def _check_notice_award(document) -> bool:
        return (
            bool(document.date) and
            bool(document.notice_award_service_provider and document.notice_award_service_provider.strip()) and
            bool(document.notice_award_authorized_rep and document.notice_award_authorized_rep.strip()) and
            bool(document.notice_award_conforme and document.notice_award_conforme.strip())
        )

    @staticmethod
    def _check_contract_services(document) -> bool:
        return (
            bool(document.date) and
            document.contract_amount is not None and
            bool(document.notarized_place and document.notarized_place.strip()) and
            bool(document.notarized_date)
        )

    @staticmethod
    def _check_notice_proceed(document) -> bool:
        return (
            bool(document.date) and
            bool(document.ntp_service_provider and document.ntp_service_provider.strip()) and
            bool(document.ntp_authorized_rep and document.ntp_authorized_rep.strip()) and
            bool(document.ntp_received_by and document.ntp_received_by.strip())
        )

    @staticmethod
    def _check_oss(document) -> bool:
        return (
            bool(document.oss_service_provider and document.oss_service_provider.strip()) and
            bool(document.oss_authorized_rep and document.oss_authorized_rep.strip()) and
            bool(document.date)
        )

    @staticmethod
    def _check_secretary_certificate(document) -> bool:
        return (
            bool(document.secretary_service_provider and document.secretary_service_provider.strip()) and
            bool(document.secretary_owner_rep and document.secretary_owner_rep.strip()) and
            bool(document.date)
        )

    @staticmethod
    def _check_rfq_variant(document, sub_doc: str) -> bool:
        return bool(document.date)

    @staticmethod
    def _check_rfq_base(document, sub_doc: str) -> bool:
        return bool(document.date)

    @staticmethod
    def _check_default_date(document) -> bool:
        return bool(document.date)