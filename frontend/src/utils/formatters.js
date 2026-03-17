/**
 * Formatting utilities for strings, dates, and numbers
 */

/**
 * Capitalize first letter of each word
 * @param {string} str - Input string
 * @returns {string} - Title case string
 */
export function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Format date for display (MM/DD/YYYY)
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDisplayDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {string|Date} date - Date to format
 * @returns {string} - ISO date string
 */
export function formatInputDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

/**
 * Format time for display (HH:MM AM/PM)
 * @param {string|Date} time - Time to format
 * @returns {string} - Formatted time string
 */
export function formatDisplayTime(time) {
    if (!time) return '';
    const d = new Date(`1970-01-01T${time}`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
export function truncateText(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate RFQ number from date (MM/DD/SSS format)
 * @param {string} dateStr - Date string
 * @returns {string} - RFQ number
 */
export function computeRFQNoFromDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const seq = String(d.getMonth() + 1).padStart(3, '0'); // 001 = Jan, 002 = Feb, etc.
    return `${month}/${day}/${seq}`;
}

/**
 * Clean filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
    if (!filename) return '';
    return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}