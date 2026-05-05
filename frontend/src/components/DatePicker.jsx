import React, { useState, useRef, useEffect } from 'react';
import { MdCalendarToday, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { MONTH_NAMES, DAYS_SHORT, getCalendarDays, formatDisplayDate } from '../utils/helpers';

/**
 * Premium, selection-only DatePicker that enforces MM/DD/YYYY format.
 * @param {string} value - YYYY-MM-DD string
 * @param {function} onChange - called with YYYY-MM-DD string
 * @param {string} placeholder - optional placeholder
 * @param {string} className - optional extra classes
 */
const DatePicker = ({ value, onChange, placeholder = 'Select Date', className = '' }) => {
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

export default DatePicker;
