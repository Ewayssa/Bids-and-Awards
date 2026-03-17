"""
Authentication and authorization validation utilities.
"""

from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from .response_builders import error_response, validation_error


def validate_username_password(username: str, password: str) -> dict:
    """
    Validate username and password for authentication.

    Args:
        username: Username to validate
        password: Password to validate

    Returns:
        dict: {'valid': bool, 'user': User|None, 'errors': list}
    """
    errors = []

    if not username or not username.strip():
        errors.append("Username is required.")
    if not password:
        errors.append("Password is required.")

    if errors:
        return {'valid': False, 'user': None, 'errors': errors}

    user = authenticate(username=username.strip(), password=password)
    if not user:
        return {'valid': False, 'user': None, 'errors': ["Invalid username or password."]}

    return {'valid': True, 'user': user, 'errors': []}


def validate_password_strength(password: str) -> dict:
    """
    Validate password strength requirements.

    Requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character

    Args:
        password: Password to validate

    Returns:
        dict: {'valid': bool, 'errors': list}
    """
    errors = []

    if len(password) < 8:
        errors.append('Password must be at least 8 characters.')

    if not any(c.isupper() for c in password):
        errors.append('Password must contain at least 1 uppercase letter.')

    if not any(c.islower() for c in password):
        errors.append('Password must contain at least 1 lowercase letter.')

    if not any(c.isdigit() for c in password):
        errors.append('Password must contain at least 1 number.')

    if not any(not c.isalnum() for c in password):
        errors.append('Password must contain at least 1 special character (e.g. !@#$%^&*).')

    return {'valid': len(errors) == 0, 'errors': errors}


def validate_email_or_username(identifier: str) -> dict:
    """
    Validate if identifier is a valid email or username.

    Args:
        identifier: Email or username to validate

    Returns:
        dict: {'valid': bool, 'type': 'email'|'username', 'errors': list}
    """
    identifier = identifier.strip() if identifier else ''

    if not identifier:
        return {'valid': False, 'type': None, 'errors': ['Identifier is required.']}

    # Check if it's an email
    try:
        validate_email(identifier)
        return {'valid': True, 'type': 'email', 'errors': []}
    except ValidationError:
        pass

    # Assume it's a username (basic validation)
    if len(identifier) < 3:
        return {'valid': False, 'type': 'username', 'errors': ['Username must be at least 3 characters.']}

    if not identifier.replace('_', '').replace('-', '').isalnum():
        return {'valid': False, 'type': 'username', 'errors': ['Username can only contain letters, numbers, underscores, and hyphens.']}

    return {'valid': True, 'type': 'username', 'errors': []}