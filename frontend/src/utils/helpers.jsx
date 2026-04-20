import React, { useState, useRef, useEffect } from 'react';
import { MdCalendarToday, MdChevronLeft, MdChevronRight } from 'react-icons/md';

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

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get days for a calendar month (including padding from prev/next months)
 */
export function getCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Padding from prev month
    for (let i = firstDay - 1; i >= 0; i--) {
        days.push({
            day: prevMonthDays - i,
            month: month === 0 ? 11 : month - 1,
            year: month === 0 ? year - 1 : year,
            currentMonth: false
        });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            month,
            year,
            currentMonth: true
        });
    }
    
    // Padding for next month (to fill 6 rows/42 cells for consistency)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({
            day: i,
            month: month === 11 ? 0 : month + 1,
            year: month === 11 ? year + 1 : year,
            currentMonth: false
        });
    }
    
    return days;
}

/**
 * Format date for display (MM/DD/YYYY)
 */
export function formatDisplayDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear());
    return `${month}/${day}/${year}`;
}

/**
 * Format date and time for display (MM/DD/YYYY HH:MM AM/PM)
 */
export function formatDisplayDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const datePart = formatDisplayDate(d);
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatInputDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Ensure date is in MM-DD-YY format for backend if it's in YYYY-MM-DD or full ISO
 */
export function toBackendDateFormat(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    
    let datePart = dateStr;
    if (dateStr.includes('T')) {
        datePart = dateStr.split('T')[0];
    }
    
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = datePart.split('-');
        return `${m}-${d}-${y.slice(-2)}`;
    }
    return dateStr;
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
    const required = ['category', 'subDoc', 'date', 'file'];
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
            return 'status-badge--pending';
        case 'ongoing':
            return 'status-badge--ongoing';
        case 'complete':
        case 'completed':
            return 'status-badge--complete';
        default:
            return '';
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



/**
 * Premium, selection-only DatePicker that enforces MM/DD/YYYY format.
 * @param {string} value - YYYY-MM-DD string
 * @param {function} onChange - called with YYYY-MM-DD string
 * @param {string} placeholder - optional placeholder
 * @param {string} className - optional extra classes
 */
export const DatePicker = ({ value, onChange, placeholder = 'Select Date', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef(null);

    // Sync viewDate when modal/value changes
    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
        } else {
            setViewDate(new Date());
        }
    }, [value, isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();
    const calendarDays = getCalendarDays(viewMonth, viewYear);

    const handlePrevMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewYear, viewMonth - 1, 1));
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        setViewDate(new Date(viewYear, viewMonth + 1, 1));
    };

    const handleSelectDay = (dayObj) => {
        const selected = new Date(dayObj.year, dayObj.month, dayObj.day);
        const yyyy = selected.getFullYear();
        const mm = String(selected.getMonth() + 1).padStart(2, '0');
        const dd = String(selected.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const isSelected = (dayObj) => {
        if (!value) return false;
        const d = new Date(value);
        return d.getDate() === dayObj.day && 
               d.getMonth() === dayObj.month && 
               d.getFullYear() === dayObj.year;
    };

    const isToday = (dayObj) => {
        const today = new Date();
        return today.getDate() === dayObj.day && 
               today.getMonth() === dayObj.month && 
               today.getFullYear() === dayObj.year;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="input-field flex items-center justify-between cursor-pointer hover:border-[var(--primary)] transition-colors pr-3"
            >
                <span className={!value ? 'text-slate-400' : 'text-[var(--text)]'}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <MdCalendarToday className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl p-4 w-72 animate-in fade-in zoom-in duration-200 origin-top-left">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        >
                            <MdChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-sm font-black uppercase tracking-widest text-[var(--text)]">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </div>
                        <button 
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        >
                            <MdChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAYS_SHORT.map(day => (
                            <div key={day} className="text-[10px] font-black text-center text-[var(--text-muted)] uppercase tracking-tighter">
                                {day[0]}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((d, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectDay(d)}
                                className={`
                                    h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                    ${!d.currentMonth ? 'text-slate-300 dark:text-slate-600' : 'text-[var(--text)]'}
                                    ${isSelected(d) ? 'bg-[var(--primary)] text-white !text-white' : 'hover:bg-[var(--background-subtle)]'}
                                    ${isToday(d) && !isSelected(d) ? 'border-2 border-[var(--primary)]/30' : ''}
                                `}
                            >
                                {d.day}
                            </button>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex justify-between">
                         <button 
                            type="button"
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                        >
                            Clear
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                const yyyy = today.getFullYear();
                                const mm = String(today.getMonth() + 1).padStart(2, '0');
                                const dd = String(today.getDate()).padStart(2, '0');
                                onChange(`${yyyy}-${mm}-${dd}`);
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest hover:underline"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


