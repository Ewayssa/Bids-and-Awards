/**
 * Global constants used across the application
 */

// Document statuses
export const DOCUMENT_STATUSES = {
    PENDING: 'pending',
    ONGOING: 'ongoing',
    COMPLETE: 'complete'
};

// Document status display names
export const DOCUMENT_STATUS_LABELS = {
    [DOCUMENT_STATUSES.PENDING]: 'Pending',
    [DOCUMENT_STATUSES.ONGOING]: 'Ongoing',
    [DOCUMENT_STATUSES.COMPLETE]: 'Complete'
};

// Required fields for new document submission
export const REQUIRED_NEW_FIELDS = ['title', 'category', 'subDoc', 'date', 'file'];

// Checklist items for document validation
export const CHECKLIST_ITEMS = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'subDoc', label: 'Sub-document' },
    { key: 'date', label: 'Date' },
    { key: 'file', label: 'File uploaded' },
];

// Table pagination
export const TABLE_PAGE_SIZE = 10;

// Modal types
export const MODAL_TYPES = {
    NEW: 'new',
    UPDATE: 'update',
    UPDATE_LIST: 'updateList',
    MANAGE: 'manage'
};

// View modes
export const VIEW_MODES = {
    LIST: 'list',
    GROUPED: 'grouped'
};

// Sort directions
export const SORT_DIRECTIONS = {
    ASC: 'asc',
    DESC: 'desc'
};

// Common months for calendar
export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Common days for calendar
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// API error messages
export const API_ERRORS = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'The requested resource was not found.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.'
};