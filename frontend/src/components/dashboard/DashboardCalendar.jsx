import React, { useState, useMemo } from 'react';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DashboardCalendar = ({ events, isAdmin, onOpenAddEvent, onOpenEditEvent }) => {
    const [viewDate, setViewDate] = useState(() => new Date());
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [events]);

    const todaysEvents = useMemo(() => {
        return sortedEvents.filter((e) => (e.date || '') === todayStr);
    }, [sortedEvents, todayStr]);

    const upcomingEvents = useMemo(() => {
        return sortedEvents.filter((e) => (e.date || '') > todayStr);
    }, [sortedEvents, todayStr]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const calendarCells = [];
    for (let i = 0; i < firstDay; i++) {
        calendarCells.push({ day: prevDays - firstDay + i + 1, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        calendarCells.push({
            day: d,
            current: true,
            isToday: year === today.getFullYear() && month === today.getMonth() && d === today.getDate(),
            date,
        });
    }
    const rest = 42 - calendarCells.length;
    for (let r = 1; r <= rest; r++) {
        calendarCells.push({ day: r, current: false });
    }

    const hasEvent = (dateStr) => sortedEvents.some((e) => e.date === dateStr);

    return (
        <section className="overflow-visible min-w-0 dashboard-section border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--border)]" style={{ animationDelay: '0.15s' }}>
            <div className="section-header section-header--nested">
                <h2 className="text-base font-bold text-[var(--text)]">Calendar</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">BAC events and deadlines</p>
            </div>
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-4 lg:gap-5 min-w-0 overflow-visible">
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={goPrevMonth}
                            className="p-2 rounded-lg hover:bg-[var(--background-subtle)] text-[var(--text-muted)] transition-all duration-300 ease-out hover:shadow-sm active:scale-95"
                            aria-label="Previous month"
                        >
                            <MdChevronLeft className="w-5 h-5 transition-transform duration-300 hover:scale-110" />
                        </button>
                        <span className="text-sm font-semibold text-[var(--text)] min-w-[140px] text-center">
                            {MONTHS[month]} {year}
                        </span>
                        <button
                            type="button"
                            onClick={goNextMonth}
                            className="p-2 rounded-lg hover:bg-[var(--background-subtle)] text-[var(--text-muted)] transition-all duration-300 ease-out hover:shadow-sm active:scale-95"
                            aria-label="Next month"
                        >
                            <MdChevronRight className="w-5 h-5 transition-transform duration-300 hover:scale-110" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {DAYS.map((d) => (
                            <div key={d} className="text-[11px] font-semibold text-[var(--text-subtle)] py-1">{d}</div>
                        ))}
                        {calendarCells.map((cell, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => cell.current && isAdmin && onOpenAddEvent(cell.date)}
                                className={`aspect-square max-h-[52px] flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 ease-out ${
                                    !cell.current
                                        ? 'text-[var(--border)] cursor-default'
                                        : isAdmin
                                        ? 'cursor-pointer active:scale-95'
                                        : 'cursor-default'
                                } ${
                                    !cell.current
                                        ? ''
                                        : cell.isToday
                                        ? 'ring-2 ring-[var(--primary)] text-[var(--text)] shadow-sm'
                                        : cell.current && hasEvent(cell.date)
                                        ? 'bg-red-100 text-red-800 font-semibold ring-2 ring-red-300 ring-inset hover:ring-red-400 hover:shadow-sm'
                                        : 'text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:shadow-sm'
                                }`}
                                aria-label={cell.current && isAdmin ? `Add event on ${cell.date}` : undefined}
                            >
                                <span>{cell.day}</span>
                                {cell.current && hasEvent(cell.date) && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5 flex-shrink-0 transition-transform duration-300 group-hover:scale-125" aria-hidden />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-shrink-0 min-w-0 w-full lg:w-36 lg:min-w-[9rem] border-t lg:border-t-0 lg:border-l border-[var(--border-light)] pt-4 lg:pt-0 lg:pl-4 overflow-visible space-y-4">
                    <EventList title="Today's events" events={todaysEvents} isAdmin={isAdmin} onEdit={onOpenEditEvent} />
                    <EventList title="Upcoming events" events={upcomingEvents} isAdmin={isAdmin} onEdit={onOpenEditEvent} />
                </div>
            </div>
        </section>
    );
};

const EventList = ({ title, events, isAdmin, onEdit }) => (
    <div>
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">{title}</p>
        {events.length === 0 ? (
            <p className="text-xs text-[var(--text-subtle)]">None scheduled.</p>
        ) : (
            <ol className="space-y-2.5 text-xs text-[var(--text-muted)] overflow-visible">
                {events.map((ev) => (
                    <li key={ev.id} className="flex gap-2.5 items-start min-w-0 group">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0 transition-transform duration-300 group-hover:scale-125" />
                        <button
                            type="button"
                            onClick={() => isAdmin && onEdit(ev)}
                            className={`min-w-0 flex-1 overflow-visible text-left ${isAdmin ? 'cursor-pointer rounded-lg hover:bg-[var(--background-subtle)] px-2 py-1 -mx-2 -my-1 transition-colors' : 'cursor-default'}`}
                        >
                            <p className="font-medium text-[var(--text)] break-words">{ev.title}</p>
                            <p className="text-[var(--text-subtle)] mt-1">{ev.date}</p>
                        </button>
                    </li>
                ))}
            </ol>
        )}
    </div>
);
