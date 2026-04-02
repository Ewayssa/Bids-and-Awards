/**
 * Consolidated helper functions for formatting, document management, and general utilities.
 */

// --- String & Text Helpers ---

/**
 * Capitalize first letter of each word
 */
export function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Truncate string with ellipsis
 */
export function truncateText(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Clean filename for safe storage
 */
export function sanitizeFilename(filename) {
    if (!filename) return '';
    return filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

// --- Date & Time Helpers ---

/**
 * Format date for display (MM/DD/YYYY)
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
 */
export function formatInputDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

/**
 * Format time for display (HH:MM AM/PM)
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
 * Generate RFQ number from date (MM/DD/SSS format)
 */
export function computeRFQNoFromDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const seq = String(d.getMonth() + 1).padStart(3, '0');
    return `${month}/${day}/${seq}`;
}

// --- Number Helpers ---

/**
 * Add commas to integer part of a number string
 */
function addCommasToInteger(str) {
    if (str === '' || str === undefined || str === null) return str === undefined || str === null ? '' : str;
    const s = String(str);
    const isNeg = s.charAt(0) === '-';
    const digits = isNeg ? s.slice(1) : s;
    if (digits === '') return s;
    let out = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
        if (i > 0 && (len - i) % 3 === 0) out += ',';
        out += digits.charAt(i);
    }
    return (isNeg ? '-' : '') + out;
}

/**
 * Format number with commas as thousands separators.
 */
export function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    const neg = n < 0;
    const abs = Math.abs(n);
    let intPart;
    let decPart = '';
    if (decimals === 0) {
        intPart = String(Math.round(abs));
    } else {
        const fixed = abs.toFixed(decimals);
        const dot = fixed.indexOf('.');
        intPart = dot >= 0 ? fixed.substring(0, dot) : fixed;
        decPart = dot >= 0 ? fixed.substring(dot) : '';
    }
    const withCommas = addCommasToInteger(intPart);
    const out = withCommas + decPart;
    return neg ? '-' + out : out;
}

// --- Document Management Helpers ---

/**
 * Get missing required fields for a document
 */
export function getMissingFields(doc) {
    const required = ['title', 'category', 'subDoc', 'date', 'file'];
    const missing = [];
    required.forEach(field => {
        const value = doc[field];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            missing.push(field);
        }
    });
    return missing;
}

/**
 * Check if document has all required fields
 */
export function isDocumentComplete(doc) {
    return getMissingFields(doc).length === 0;
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'ongoing':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'complete':
        case 'completed':
            return 'bg-green-100 text-green-800 border-green-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

/**
 * Get status icon for UI display
 */
export function getStatusIcon(status) {
    switch (status) {
        case 'pending': return 'MdSchedule';
        case 'ongoing': return 'MdTimeline';
        case 'complete': return 'MdCheckCircle';
        default: return 'MdDescription';
    }
}

/**
 * Filter documents by search query
 */
export function filterDocumentsByQuery(documents, query) {
    if (!query) return documents;
    const lowerQuery = query.toLowerCase();
    return documents.filter(doc =>
        doc.title?.toLowerCase().includes(lowerQuery) ||
        doc.category?.toLowerCase().includes(lowerQuery) ||
        doc.subDoc?.toLowerCase().includes(lowerQuery) ||
        doc.prNo?.toLowerCase().includes(lowerQuery) ||
        doc.uploadedBy?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Filter documents by category
 */
export function filterDocumentsByCategory(documents, category) {
    if (!category) return documents;
    return documents.filter(doc => doc.category === category);
}

/**
 * Filter documents by status
 */
export function filterDocumentsByStatus(documents, status) {
    if (!status) return documents;
    return documents.filter(doc => doc.status === status);
}

/**
 * Sort documents by field
 */
export function sortDocuments(documents, sortKey, sortDir) {
    if (!sortKey) return documents;
    return [...documents].sort((a, b) => {
        let aVal, bVal;
        switch (sortKey) {
            case 'uploaded_at':
            case 'updated_at':
                aVal = new Date(a[sortKey] || 0).getTime();
                bVal = new Date(b[sortKey] || 0).getTime();
                break;
            case 'status':
            case 'category':
                aVal = a[sortKey] || '';
                bVal = b[sortKey] || '';
                break;
            default:
                aVal = String(a[sortKey] || '').toLowerCase();
                bVal = String(b[sortKey] || '').toLowerCase();
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Group documents by category
 */
export function groupDocumentsByCategory(documents) {
    return documents.reduce((groups, doc) => {
        const category = doc.category || 'Uncategorized';
        if (!groups[category]) groups[category] = [];
        groups[category].push(doc);
        return groups;
    }, {});
}
