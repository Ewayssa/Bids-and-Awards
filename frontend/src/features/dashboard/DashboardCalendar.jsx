import React, { useState, useMemo } from 'react';
import { MdChevronLeft, MdChevronRight, MdTimeline } from 'react-icons/md';

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
        <section className="overflow-visible min-w-0 dashboard-section border-b lg:border-b-0 lg:border-r border-[var(--border-light)]" style={{ animationDelay: '0.15s' }}>
            <div className="px-6 py-5 border-b border-[var(--border-light)] bg-white/50">
                <h2 className="text-sm font-bold text-[var(--text)] uppercase tracking-widest flex items-center gap-2">
                    <MdTimeline className="w-4 h-4 text-[var(--primary)]" />
                    Calendar of Activities
                </h2>
                <p className="text-[11px] text-[var(--text-subtle)] mt-1 font-medium">Bids and Awards Committee Schedule</p>
            </div>
            <div className="p-6 flex flex-col xl:flex-row gap-8 min-w-0 overflow-visible bg-white">
                <div className="flex-1 min-w-0 flex flex-col gap-5">
                    <div className="flex items-center justify-between gap-4 px-2">
                        <button
                            type="button"
                            onClick={goPrevMonth}
                            className="p-2 rounded-xl hover:bg-[var(--background-subtle)] text-[var(--text-muted)] transition-all duration-300 ease-out hover:shadow-sm active:scale-90 border border-transparent hover:border-[var(--border)]"
                            aria-label="Previous month"
                        >
                            <MdChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-base font-bold text-[var(--text)] tracking-tight">
                            {MONTHS[month]} {year}
                        </span>
                        <button
                            type="button"
                            onClick={goNextMonth}
                            className="p-2 rounded-xl hover:bg-[var(--background-subtle)] text-[var(--text-muted)] transition-all duration-300 ease-out hover:shadow-sm active:scale-90 border border-transparent hover:border-[var(--border)]"
                            aria-label="Next month"
                        >
                            <MdChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                        {DAYS.map((d) => (
                            <div key={d} className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest py-1">{d}</div>
                        ))}
                        {calendarCells.map((cell, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => cell.current && isAdmin && onOpenAddEvent(cell.date)}
                                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 ease-out relative group ${
                                    !cell.current
                                        ? 'text-[var(--border)] cursor-default'
                                        : isAdmin
                                        ? 'cursor-pointer active:scale-95'
                                        : 'cursor-default'
                                } ${
                                    !cell.current
                                        ? ''
                                        : cell.isToday
                                        ? 'bg-[var(--primary)] text-white shadow-lg shadow-[color-mix(in_srgb,var(--primary)_30%,transparent)] z-10'
                                        : cell.current && hasEvent(cell.date)
                                        ? 'bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100 hover:ring-red-200'
                                        : 'text-[var(--text-muted)] hover:bg-[var(--background-subtle)] border border-transparent hover:border-[var(--border)]'
                                }`}
                                aria-label={cell.current && isAdmin ? `Add event on ${cell.date}` : undefined}
                            >
                                <span className={cell.isToday ? 'scale-110' : ''}>{cell.day}</span>
                                {cell.current && hasEvent(cell.date) && !cell.isToday && (
                                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-red-500 group-hover:scale-150 transition-transform duration-300" aria-hidden />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-shrink-0 min-w-0 w-full xl:w-48 xl:min-w-[12rem] border-t xl:border-t-0 xl:border-l border-[var(--border-light)] pt-6 xl:pt-0 xl:pl-6 overflow-visible space-y-6">
                    <EventList title="TODAY" events={todaysEvents} isAdmin={isAdmin} onEdit={onOpenEditEvent} iconColor="var(--primary)" />
                    <EventList title="UPCOMING" events={upcomingEvents} isAdmin={isAdmin} onEdit={onOpenEditEvent} iconColor="orange" />
                </div>
            </div>
        </section>
    );
};

const EventList = ({ title, events, isAdmin, onEdit, iconColor = 'var(--primary)' }) => (
    <div className="space-y-4">
        <p className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: iconColor }}></span>
            {title}
        </p>
        {events.length === 0 ? (
            <p className="text-[11px] text-[var(--text-subtle)] font-medium bg-[color-mix(in_srgb,var(--background-subtle)_50%,transparent)] px-3 py-2 rounded-lg border border-[var(--border-light)]">No events scheduled.</p>
        ) : (
            <ol className="space-y-3">
                {events.map((ev) => (
                    <li key={ev.id} className="group list-none">
                        <button
                            type="button"
                            onClick={() => isAdmin && onEdit(ev)}
                            className={`w-full text-left p-3 rounded-xl border border-transparent transition-all duration-300 ${isAdmin ? 'hover:border-[var(--border)] hover:bg-[var(--background-subtle)] hover:shadow-sm' : 'cursor-default'}`}
                        >
                            <p className="text-xs font-bold text-[var(--text)] leading-snug group-hover:text-[var(--primary)] transition-colors">{ev.title}</p>
                            <p className="text-[10px] font-semibold text-[var(--text-subtle)] mt-1 uppercase tracking-wider">{ev.date}</p>
                        </button>
                    </li>
                ))}
            </ol>
        )}
    </div>
);
