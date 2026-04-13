/**
 * Centralized validation and formatting utilities
 * Shared between frontend and backend where possible
 */

/**
 * Remove all non-letter characters and spaces
 * @param {string} value - Input string
 * @returns {string} - Letters and spaces only
 */
export function toLettersOnly(value) {
    return value.replace(/[^A-Za-z\s]/g, '');
}

/**
 * Remove all non-numeric characters except decimal point
 * @param {string|number} value - Input value
 * @returns {string} - Numbers and decimal only, max 2 decimal places
 */
export function toNumbersOnly(value) {
    const cleaned = String(value || '').replace(/[^0-9.]/g, '');
    if (!cleaned) return '';
    const parts = cleaned.split('.');
    const intPart = parts[0] || '';
    const decPart = parts.length > 1 ? parts[1].slice(0, 2) : '';
    return decPart ? `${intPart}.${decPart}` : intPart;
}

/**
 * Format number as Philippine Peso currency
 * @param {string|number} value - Numeric value
 * @returns {string} - Formatted currency string
 */
export function formatCurrencyValue(value) {
    const cleaned = toNumbersOnly(String(value || ''));
    if (!cleaned) return '';
    const num = parseFloat(cleaned);
    if (Number.isNaN(num)) return '';
    return num.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Validate required fields for document submission
 * @param {Object} form - Form data object
 * @param {Array} requiredFields - List of required field names
 * @returns {Object} - { valid: boolean, errors: { field: message } }
 */
export function validateRequiredFields(form, requiredFields) {
    const errors = {};
    requiredFields.forEach(field => {
        const value = form[field];
        if (value === null || value === undefined || value === '') {
            errors[field] = `${field} is required`;
        }
    });
    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string
 * @returns {boolean} - True if valid date format
 */
export function isValidDateFormat(dateStr) {
    if (!dateStr) return false;
    // Support YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const d = new Date(dateStr);
        return !Number.isNaN(d.getTime());
    }
    // Support MM-DD-YY
    if (dateStr.match(/^\d{2}-\d{2}-\d{2}$/)) {
        const [m, d, y] = dateStr.split('-').map(Number);
        if (m < 1 || m > 12 || d < 1 || d > 31) return false;
        return true;
    }
    return false;
}

/**
 * Validate email format
 * @param {string} email - Email string
 * @returns {boolean} - True if valid email
 */
export function isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Philippine mobile number format
 * @param {string} number - Phone number
 * @returns {boolean} - True if valid format
 */
export function isValidPhoneNumber(number) {
    if (!number) return false;
    // Allow +63 or 09 prefixes, then 9 digits
    const phoneRegex = /^(\+63|0)9\d{9}$/;
    return phoneRegex.test(number.replace(/\s/g, ''));
}