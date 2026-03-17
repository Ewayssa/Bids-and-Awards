/**
 * API error handling utilities
 */

/**
 * Parse API error response
 * @param {Object} error - Error object from axios
 * @returns {string} - User-friendly error message
 */
export function parseApiError(error) {
    if (!error) return 'An unknown error occurred';

    const response = error.response;
    if (!response) {
        return error.message || 'Network error occurred';
    }

    const { status, data } = response;

    // Handle different status codes
    switch (status) {
        case 400:
            return parseValidationError(data);
        case 401:
            return 'You are not authorized. Please log in again.';
        case 403:
            return 'You do not have permission to perform this action.';
        case 404:
            return 'The requested resource was not found.';
        case 409:
            return 'A conflict occurred. Please try again.';
        case 422:
            return parseValidationError(data);
        case 500:
            return 'Server error. Please try again later.';
        default:
            return data?.detail || data?.message || `Error ${status}: ${data}`;
    }
}

/**
 * Parse validation errors from API
 * @param {Object|string} data - Error response data
 * @returns {string} - Formatted error message
 */
function parseValidationError(data) {
    if (typeof data === 'string') {
        return data;
    }

    if (data?.detail) {
        if (Array.isArray(data.detail)) {
            return data.detail.join(' ');
        }
        return String(data.detail);
    }

    if (data?.errors) {
        const errors = data.errors;
        if (typeof errors === 'object') {
            const messages = [];
            Object.entries(errors).forEach(([field, fieldErrors]) => {
                const fieldMsgs = Array.isArray(fieldErrors) ? fieldErrors : [fieldErrors];
                messages.push(`${field}: ${fieldMsgs.join(', ')}`);
            });
            return messages.join('; ');
        }
    }

    // Fallback: find first error message
    const firstKey = Object.keys(data || {})[0];
    if (firstKey) {
        const firstVal = data[firstKey];
        if (Array.isArray(firstVal)) {
            return firstVal.join(' ');
        }
        return String(firstVal);
    }

    return 'Validation error occurred';
}

/**
 * Check if error is a network error
 * @param {Object} error - Error object
 * @returns {boolean} - True if network error
 */
export function isNetworkError(error) {
    return !error.response && error.message;
}

/**
 * Check if error is an authentication error
 * @param {Object} error - Error object
 * @returns {boolean} - True if auth error
 */
export function isAuthError(error) {
    return error.response?.status === 401;
}

/**
 * Check if error is a validation error
 * @param {Object} error - Error object
 * @returns {boolean} - True if validation error
 */
export function isValidationError(error) {
    const status = error.response?.status;
    return status === 400 || status === 422;
}