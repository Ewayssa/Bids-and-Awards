"""
Standardized API response builders for consistent error handling.
"""

from rest_framework import status
from rest_framework.response import Response


def error_response(message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    """
    Create a standardized error response.

    Args:
        message: Error message to return
        status_code: HTTP status code (default: 400)

    Returns:
        DRF Response object
    """
    return Response({'detail': message}, status=status_code)


def success_response(data=None, status_code: int = status.HTTP_200_OK) -> Response:
    """
    Create a standardized success response.

    Args:
        data: Response data (optional)
        status_code: HTTP status code (default: 200)

    Returns:
        DRF Response object
    """
    if data is not None:
        return Response(data, status=status_code)
    return Response(status=status_code)


def validation_error(field: str, message: str) -> Response:
    """
    Create a validation error response for a specific field.

    Args:
        field: Field name that failed validation
        message: Validation error message

    Returns:
        DRF Response object with field-specific error
    """
    return Response({field: [message]}, status=status.HTTP_400_BAD_REQUEST)


def unauthorized_response(message: str = "You are not authorized to perform this action.") -> Response:
    """Create an unauthorized response."""
    return error_response(message, status.HTTP_401_UNAUTHORIZED)


def forbidden_response(message: str = "Access denied.") -> Response:
    """Create a forbidden response."""
    return error_response(message, status.HTTP_403_FORBIDDEN)


def not_found_response(message: str = "The requested resource was not found.") -> Response:
    """Create a not found response."""
    return error_response(message, status.HTTP_404_NOT_FOUND)