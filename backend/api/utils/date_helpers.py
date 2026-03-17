"""
Date and time utility functions for consistent date handling.
"""

from datetime import datetime, date
from typing import Optional, Union


def parse_date_parameter(date_input: Union[str, date, None]) -> Optional[date]:
    """
    Parse various date input formats into a date object.

    Args:
        date_input: Date in string, date object, or None

    Returns:
        date object or None if invalid
    """
    if not date_input:
        return None

    if isinstance(date_input, date):
        return date_input

    if isinstance(date_input, str):
        try:
            # Try ISO format first (YYYY-MM-DD)
            return datetime.fromisoformat(date_input).date()
        except ValueError:
            # Try other common formats
            for fmt in ['%m/%d/%Y', '%Y/%m/%d', '%d-%m-%Y']:
                try:
                    return datetime.strptime(date_input, fmt).date()
                except ValueError:
                    continue

    return None


def get_transaction_number(date_obj: Optional[date]) -> str:
    """
    Generate transaction number from date (format: YYYY-MM-NNN).

    Args:
        date_obj: Date to generate transaction number for

    Returns:
        Transaction number string or '—' if no date
    """
    if not date_obj:
        return '—'

    # Format: YYYY-MM-NNN where NNN is month number (001-012)
    year = date_obj.year
    month = date_obj.month
    month_padded = f"{month:02d}"
    month_sequence = f"{month:03d}"

    return f"{year}-{month_padded}-{month_sequence}"


def format_date_for_display(date_obj: Optional[date], format_str: str = '%B %d, %Y') -> str:
    """
    Format date for display purposes.

    Args:
        date_obj: Date to format
        format_str: strftime format string

    Returns:
        Formatted date string or empty string if None
    """
    if not date_obj:
        return ''

    return date_obj.strftime(format_str)


def is_valid_date_range(start_date: Optional[date], end_date: Optional[date]) -> bool:
    """
    Check if date range is valid (start <= end).

    Args:
        start_date: Start date
        end_date: End date

    Returns:
        True if valid range or either date is None
    """
    if not start_date or not end_date:
        return True

    return start_date <= end_date