import { DATE_MIN, DATE_MAX } from '../constants/reportConstants';

/**
 * Formats a date to ISO string (YYYY-MM-DD)
 */
export const formatDate = (d, { forFilter = false } = {}) => {
    if (!d) return forFilter ? '' : '—';
    const dateObj = typeof d === 'string' ? new Date(d) : d instanceof Date ? d : new Date(String(d));
    if (Number.isNaN(dateObj.getTime())) return forFilter ? '' : '—';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a date to DD-MM-YYYY format
 */
export const toDDMMYYYY = (val) => {
    if (val == null || val === '') return '';
    const d = typeof val === 'string' ? new Date(val) : val;
    if (Number.isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Formats a number with Philippine Peso sign and separators
 */
export const formatNumberDisplay = (val) => {
    if (val == null || val === '') return '';
    const n = Number(val);
    if (Number.isNaN(n)) return '';
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a number string as the user types (with peso sign and commas)
 */
export const formatNumberAsYouType = (rawStr) => {
    if (rawStr == null || rawStr === '') return '';
    const s = String(rawStr).replace(/[^0-9.]/g, '');
    const parts = s.split('.');
    const intPart = parts[0] || '0';
    const decPart = parts.length > 1 ? parts[1].slice(0, 2) : '';
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '₱' + withCommas + (decPart ? '.' + decPart : '');
};

/**
 * Sanitizes numeric input to allow only digits and decimal point
 */
export const sanitizeNumberInput = (str) => {
    if (str == null) return '';
    const s = String(str).replace(/[^0-9.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return s;
};

/**
 * Validates if a date is within the allowed range
 */
export const validateDateRange = (val) => {
    if (val == null || val === '') return true;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return false;
    const min = new Date(DATE_MIN);
    const max = new Date(DATE_MAX);
    return d >= min && d <= max;
};

/**
 * Normalizes backend URLs for fetching
 */
export const getFetchUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('/')) return url;
    try {
        const parsed = new URL(url);
        return parsed.pathname + parsed.search;
    } catch {
        return url;
    }
};

/**
 * Converts relative paths to absolute URLs
 */
export const toFullUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
};

/**
 * Gets suggested file extension from URL
 */
export const getSuggestedExt = (url) => {
    if (!url || typeof url !== 'string') return '.pdf';
    const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return m ? `.${m[1].toLowerCase()}` : '.pdf';
};
/**
 * Returns authentication headers with the current JWT token
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};
