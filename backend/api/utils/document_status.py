"""
Document status calculation utilities.
Handles the logic for determining document completeness status.
"""

from django.utils import timezone


class DocumentStatusCalculator:
    """Calculates document status based on sub-document type requirements."""

    # Sub-docs that don't require a file upload
    NO_FILE_REQUIRED_EXACT = {
        'Purchase Request',
        'Notice of Award (Posted)',
        'Abstract of Quotation (Posted)',
        'BAC Resolution (Posted)',
    }

    NO_FILE_REQUIRED_KEYWORDS = {
        'Lease of Venue',
        'Small Value Procurement',
        'Public Bidding',
        'Minutes of the Meeting',
    }

    @staticmethod
    def _is_filled(val):
        """Helper to check if a field value is present and not empty."""
        if val is None:
            return False
        if isinstance(val, str):
            return bool(val.strip())
        return True

    @classmethod
    def is_new_procurement(cls, document) -> bool:
        """Check if document is new procurement (Procurement category, recent/empty prNo)."""
        category = (document.category or '').strip()
        if category != 'Procurement':
            return False
        pr_no = (document.prNo or '').strip()
        if not pr_no:
            return True
        try:
            current_ym = timezone.now().date().strftime('%Y-%m')
            return pr_no.startswith(current_ym + '-')
        except Exception:
            return True

    @classmethod
    def calculate_status(cls, document) -> str:
        """Calculate document status based on file and basic field presence."""
        sub_doc = (document.subDoc or '').strip()

        # If a file is uploaded, the document is complete
        if cls._has_required_file_uploaded(document):
            return 'complete'

        # Check if basic fields are filled for completeness
        ignore_prno = cls.is_new_procurement(document)
        if cls._has_basic_fields(document, ignore_prno=ignore_prno):
            # For Purchase Request: complete if title + date + basic fields are filled
            # (no file required for PR)
            if sub_doc == 'Purchase Request':
                return 'complete'

        # Partial: has file or has any data entered
        actual_has_file = bool(document.file and getattr(document.file, 'name', None))
        if actual_has_file or cls._has_any_data(document):
            return 'ongoing'

        return 'pending'

    @classmethod
    def _has_required_file_uploaded(cls, document) -> bool:
        """Return True if the document has a file uploaded."""
        has_file = bool(document.file)
        if has_file and hasattr(document.file, 'name'):
            has_file = bool(document.file.name and str(document.file.name).strip())
        return has_file

    @classmethod
    def _has_basic_fields(cls, document, ignore_prno=False) -> bool:
        """Check basic required fields that apply to all documents."""
        sub_doc = (document.subDoc or '').strip()

        # PHILGEPS sub-docs don't need a title
        title_required = not sub_doc.startswith('PHILGEPS - ')
        # PHILGEPS - Lease of Venue doesn't need a date
        date_required = sub_doc != 'PHILGEPS - Lease of Venue'

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
    def _has_any_data(cls, document) -> bool:
        """Check if any meaningful field has been filled (for 'ongoing' detection)."""
        if bool(document.title and document.title.strip()):
            return True
        if bool(document.date):
            return True
        return False
