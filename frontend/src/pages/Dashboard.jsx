import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { dashboardService, calendarEventService, documentService } from '../services/api';
import { ROLES } from '../utils/roles';
import { MdCheckCircle, MdSchedule, MdChevronLeft, MdChevronRight, MdAdd, MdClose, MdWarning, MdDashboard, MdEdit } from 'react-icons/md';
import NotificationBell from '../components/NotificationBell';
import PageHeader from '../components/PageHeader';
import UserAccountDropdown from '../components/UserAccountDropdown';
import { formatNumber } from '../utils/formatNumber';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Dashboard = ({ user, sidebarOpen = true, onLogout }) => {
    const location = useLocation();
    const [stats, setStats] = useState({ pieData: [0, 0, 0, 0], totalDocumentsUploaded: 0, calendarEvents: [], procurementMethodCounts: { 'List of Venue': 0, 'Small Value Procurement': 0, 'Public Bidding': 0 } });
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(() => new Date());
    const [eventModal, setEventModal] = useState(null); // { date } when open
    const [eventTitle, setEventTitle] = useState('');
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [eventError, setEventError] = useState('');
    const [confirmAddEvent, setConfirmAddEvent] = useState(null); // { message, onConfirm }
    const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null); // { ev, onConfirm }
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [editEventModal, setEditEventModal] = useState(null); // { ev } when open; ev has id, title, date
    const [editEventTitle, setEditEventTitle] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editEventSubmitting, setEditEventSubmitting] = useState(false);
    const [editEventError, setEditEventError] = useState('');
    const [ringProgress, setRingProgress] = useState(0);
    const [hoveredSlice, setHoveredSlice] = useState(null);

    const loadData = React.useCallback(async () => {
        if (location.pathname !== '/') return;
        try {
            const [data, docsResponse] = await Promise.all([
                dashboardService.getData(true, ''),
                documentService.getAll(),
            ]);
            const list = Array.isArray(docsResponse) ? docsResponse : (docsResponse?.results ?? []);
            const sorted = [...list].sort((a, b) => (new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime()));
            setStats({
                pieData: data?.pieData ?? [0, 0, 0, 0],
                totalDocumentsUploaded: typeof data?.totalDocumentsUploaded === 'number' ? data.totalDocumentsUploaded : (data?.pieData ? (Number(data.pieData[1]) + Number(data.pieData[2])) : 0),
                calendarEvents: data?.calendarEvents ?? [],
                procurementMethodCounts: data?.procurementMethodCounts ?? { 'List of Venue': 0, 'Small Value Procurement': 0, 'Public Bidding': 0 },
            });
            setDocuments(sorted);
        } catch {
            setStats({ pieData: [0, 0, 0, 0], totalDocumentsUploaded: 0, calendarEvents: [], procurementMethodCounts: { 'List of Venue': 0, 'Small Value Procurement': 0, 'Public Bidding': 0 } });
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [location.pathname]);

    useEffect(() => {
        if (location.pathname !== '/') return;
        setLoading(true);
        let cancelled = false;
        (async () => {
            await loadData();
            if (cancelled) return;
        })();
        return () => { cancelled = true; };
    }, [user, location.pathname, loadData]);

    // Animate the document-status ring when data is ready
    useEffect(() => {
        if (loading || location.pathname !== '/') return;
        setRingProgress(0);
        const duration = 700;
        const start = performance.now();
        let rafId;
        const tick = (now) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 2.2);
            setRingProgress(eased);
            if (t < 1) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [loading, stats.pieData, location.pathname]);

    // Refetch when user returns to tab for real-time accuracy
    useEffect(() => {
        if (location.pathname !== '/') return;
        const onFocus = () => loadData();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [location.pathname, loadData]);

    // Periodic refresh every 60s while on Dashboard for real-time counts
    useEffect(() => {
        if (location.pathname !== '/') return;
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, [location.pathname, loadData]);

    // Backend: total=25 checklist slots, completed/ongoing = slots with doc (by status), pending = slots with no doc yet
    const [total, completed, ongoing, pending] = (stats.pieData ?? [0, 0, 0, 0]).map(Number);
    const totalNorm = total || 1;
    const completedPct = (completed / totalNorm) * 100;
    const ongoingPct = (ongoing / totalNorm) * 100;
    const pendingPct = (pending / totalNorm) * 100;
    const events = React.useMemo(() => {
        const list = stats.calendarEvents ?? [];
        return [...list].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [stats.calendarEvents]);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todaysEvents = React.useMemo(() => {
        return events.filter((e) => (e.date || '') === todayStr);
    }, [events, todayStr]);
    const upcomingEvents = React.useMemo(() => {
        return events.filter((e) => (e.date || '') > todayStr);
    }, [events, todayStr]);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
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
        calendarCells.push({
            day: d,
            current: true,
            isToday: year === todayYear && month === todayMonth && d === todayDate,
            date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        });
    }
    const rest = 42 - calendarCells.length;
    for (let r = 1; r <= rest; r++) {
        calendarCells.push({ day: r, current: false });
    }

    const hasEvent = (dateStr) => events.some((e) => e.date === dateStr);
    const isAdmin = user?.role === ROLES.ADMIN;

    const openAddEvent = (dateStr) => {
        if (!isAdmin) return;
        setEventModal({ date: dateStr });
        setEventTitle('');
        setEventError('');
    };

    const closeEventModal = () => {
        setEventModal(null);
        setEventTitle('');
        setEventError('');
        setConfirmAddEvent(null);
    };

    const performAddEvent = async () => {
        if (!eventModal?.date || !eventTitle.trim()) return;
        setEventSubmitting(true);
        setEventError('');
        try {
            const created = await calendarEventService.create({
                title: eventTitle.trim(),
                date: eventModal.date,
            });
            const newEvent = {
                id: created.id,
                title: created.title || eventTitle.trim(),
                date: typeof created.date === 'string' ? created.date.slice(0, 10) : eventModal.date,
            };
            setStats((prev) => ({
                ...prev,
                pieData: prev.pieData,
                calendarEvents: [...(prev.calendarEvents || []), newEvent],
            }));
            closeEventModal();
            const data = await dashboardService.getData(true, '');
            setStats((prev) => ({
                ...prev,
                pieData: data?.pieData ?? prev.pieData,
                totalDocumentsUploaded: typeof data?.totalDocumentsUploaded === 'number' ? data.totalDocumentsUploaded : prev.totalDocumentsUploaded,
                calendarEvents: data?.calendarEvents ?? prev.calendarEvents,
                procurementMethodCounts: data?.procurementMethodCounts ?? prev.procurementMethodCounts,
            }));
        } catch (err) {
            const data = err.response?.data;
            const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0];
            const fieldErrors = data && typeof data === 'object' && !Array.isArray(data) && !data.detail
                ? Object.values(data).flat().filter(Boolean)[0]
                : null;
            setEventError(detail || fieldErrors || err.message || 'Failed to add event.');
        } finally {
            setEventSubmitting(false);
        }
    };

    const performDeleteEvent = async (id) => {
        setDeleteSubmitting(true);
        try {
            await calendarEventService.delete(id);
            const data = await dashboardService.getData(true, '');
            setStats({
                pieData: data?.pieData ?? [0, 0, 0, 0],
                totalDocumentsUploaded: typeof data?.totalDocumentsUploaded === 'number' ? data.totalDocumentsUploaded : (data?.pieData ? (Number(data.pieData[1]) + Number(data.pieData[2])) : 0),
                calendarEvents: data?.calendarEvents ?? [],
                procurementMethodCounts: data?.procurementMethodCounts ?? { 'List of Venue': 0, 'Small Value Procurement': 0, 'Public Bidding': 0 },
            });
            setConfirmDeleteEvent(null);
            setEditEventModal(null);
        } catch {
            // keep dialog open on error; user can cancel
        } finally {
            setDeleteSubmitting(false);
        }
    };

    const openEditEvent = (ev) => {
        if (!isAdmin || !ev) return;
        setEditEventModal({ ev });
        setEditEventTitle(ev.title || '');
        setEditEventDate(ev.date || '');
        setEditEventError('');
    };

    const closeEditEventModal = () => {
        setEditEventModal(null);
        setEditEventTitle('');
        setEditEventDate('');
        setEditEventError('');
    };

    const performUpdateEvent = async () => {
        const ev = editEventModal?.ev;
        if (!ev?.id || !editEventTitle.trim() || !editEventDate.trim()) {
            setEditEventError('Title and date are required.');
            return;
        }
        setEditEventSubmitting(true);
        setEditEventError('');
        try {
            const updated = await calendarEventService.update(ev.id, {
                title: editEventTitle.trim(),
                date: editEventDate.trim(),
            });
            const normalizedDate = typeof updated.date === 'string' ? updated.date.slice(0, 10) : editEventDate;
            setStats((prev) => ({
                ...prev,
                calendarEvents: (prev.calendarEvents || []).map((e) =>
                    e.id === ev.id ? { ...e, title: updated.title || editEventTitle.trim(), date: normalizedDate } : e
                ),
            }));
            closeEditEventModal();
            const data = await dashboardService.getData(true, '');
            setStats((prev) => ({
                ...prev,
                pieData: data?.pieData ?? prev.pieData,
                totalDocumentsUploaded: typeof data?.totalDocumentsUploaded === 'number' ? data.totalDocumentsUploaded : prev.totalDocumentsUploaded,
                calendarEvents: data?.calendarEvents ?? prev.calendarEvents,
                procurementMethodCounts: data?.procurementMethodCounts ?? prev.procurementMethodCounts,
            }));
        } catch (err) {
            const data = err.response?.data;
            const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0];
            const fieldErrors = data && typeof data === 'object' && !Array.isArray(data) && !data.detail
                ? Object.values(data).flat().filter(Boolean)[0]
                : null;
            setEditEventError(detail || fieldErrors || err.message || 'Failed to update event.');
        } finally {
            setEditEventSubmitting(false);
        }
    };

    const submitEvent = (e) => {
        e.preventDefault();
        if (!eventModal?.date || !eventTitle.trim()) {
            setEventError('Event title is required.');
            return;
        }
        setConfirmAddEvent({
            message: 'Are you sure you want to add this event?',
            onConfirm: () => {
                setConfirmAddEvent(null);
                performAddEvent();
            },
        });
    };

    // Pie chart: full circle = 360°, start from top (0°), clockwise. Order: Completed → On-going → Pending (like pizza slices).
    const totalAngle = 360;
    const r = 40;
    const cx = 50;
    const cy = 50;
    const deg = (pct) => (pct / 100) * totalAngle;
    const angleToXY = (angleDeg) => {
        const rad = (angleDeg - 90) * (Math.PI / 180);
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const wedgePath = (startDeg, endDeg) => {
        if (endDeg <= startDeg) return '';
        const s = angleToXY(startDeg);
        const e = angleToXY(endDeg);
        const large = endDeg - startDeg > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
    };
    const completedEnd = deg(completedPct) * ringProgress;
    const ongoingEnd = completedEnd + deg(ongoingPct) * ringProgress;
    const pendingEnd = ongoingEnd + deg(pendingPct) * ringProgress;
    const explodeDist = 6;
    const sliceMeta = [
        { start: 0, end: completedEnd, fill: 'url(#pie-completed)', label: 'Completed', value: completed, pct: completedPct, color: '#22c55e' },
        { start: completedEnd, end: ongoingEnd, fill: 'url(#pie-ongoing)', label: 'On-going', value: ongoing, pct: ongoingPct, color: '#facc15' },
        { start: ongoingEnd, end: pendingEnd, fill: 'url(#pie-pending)', label: 'Pending', value: pending, pct: pendingPct, color: '#e03d3d' },
    ];
    const pieSlices = sliceMeta.map((s) => {
        const path = wedgePath(s.start, s.end);
        const midAngle = (s.start + s.end) / 2;
        const mid = angleToXY(midAngle);
        const explodeDx = ((mid.x - cx) / r) * explodeDist;
        const explodeDy = ((mid.y - cy) / r) * explodeDist;
        return { ...s, path, explodeDx, explodeDy };
    });
    const dateLabel = today.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    const procurementMethodCounts = stats.procurementMethodCounts ?? { 'List of Venue': 0, 'Small Value Procurement': 0, 'Public Bidding': 0 };
    const barLabels = ['Lease of Venue', 'Small Value Procurement', 'Public Bidding'];
    const barColors = ['#22c55e', '#3b82f6', '#8b5cf6'];
    const barValues = barLabels.map((label) => Number(procurementMethodCounts[label]) || 0);
    const barMax = Math.max(1, ...barValues);

    const statCards = [
        { value: completed, label: 'Completed', icon: MdCheckCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600', link: '/encode?status=complete' },
        { value: ongoing, label: 'On-going', icon: MdSchedule, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', link: '/encode?status=ongoing' },
        { value: pending, label: 'Pending', icon: MdWarning, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', link: '/encode?status=pending' },
    ];

    return (
        <div className="space-y-8 pb-10">
            <PageHeader
                title="BAC Dashboard"
                subtitle={dateLabel}
                titleSize="default"
            >
                <div className="flex items-center gap-3">
                    <NotificationBell user={user} />
                    <UserAccountDropdown user={user} onLogout={onLogout} />
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 dashboard-stat-cards">
                {statCards.map(({ value, label, icon: Icon, iconBg, iconColor, link }, i) => (
                    <Link key={label} to={link || '#'} className="card overflow-visible p-4 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[var(--shadow-lg)] group block min-w-0 dashboard-stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="mb-3">
                            <span className={`inline-flex w-9 h-9 rounded-lg items-center justify-center flex-shrink-0 ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
                                <Icon className="w-4 h-4" />
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">{label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-[var(--text)] tabular-nums mt-0.5">{loading ? '—' : formatNumber(value)}</p>
                    </Link>
                ))}
            </div>

            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full dashboard-grid">
                    <section className="card overflow-visible min-w-0 dashboard-section" style={{ animationDelay: '0.15s' }}>
                        <div className="px-5 py-4 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/30">
                            <h2 className="text-base font-semibold text-[var(--text)]">Calendar</h2>
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
                                            onClick={() => cell.current && isAdmin && openAddEvent(cell.date)}
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
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">Today&apos;s events</p>
                                    {todaysEvents.length === 0 ? (
                                        <p className="text-xs text-[var(--text-subtle)]">None scheduled.</p>
                                    ) : (
                                        <ol className="space-y-2.5 text-xs text-[var(--text-muted)] overflow-visible">
                                            {todaysEvents.map((ev) => (
                                                <li key={ev.id} className="flex gap-2.5 items-start min-w-0 group">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0 transition-transform duration-300 group-hover:scale-125" />
                                                    <button
                                                        type="button"
                                                        onClick={() => isAdmin && openEditEvent(ev)}
                                                        className={`min-w-0 flex-1 overflow-visible text-left ${isAdmin ? 'cursor-pointer rounded-lg hover:bg-[var(--background-subtle)] px-2 py-1 -mx-2 -my-1 transition-colors' : 'cursor-default'}`}
                                                        aria-label={isAdmin ? `Edit or delete event: ${ev.title}` : undefined}
                                                    >
                                                        <p className="font-medium text-[var(--text)] break-words">{ev.title}</p>
                                                        <p className="text-[var(--text-subtle)] mt-1">{ev.date}</p>
                                                    </button>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">Upcoming events</p>
                                    {upcomingEvents.length === 0 ? (
                                        <p className="text-xs text-[var(--text-subtle)]">None scheduled.</p>
                                    ) : (
                                        <ol className="space-y-2.5 text-xs text-[var(--text-muted)] overflow-visible">
                                            {upcomingEvents.map((ev) => (
                                                <li key={ev.id} className="flex gap-2.5 items-start min-w-0 group">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0 transition-transform duration-300 group-hover:scale-125" />
                                                    <button
                                                        type="button"
                                                        onClick={() => isAdmin && openEditEvent(ev)}
                                                        className={`min-w-0 flex-1 overflow-visible text-left ${isAdmin ? 'cursor-pointer rounded-lg hover:bg-[var(--background-subtle)] px-2 py-1 -mx-2 -my-1 transition-colors' : 'cursor-default'}`}
                                                        aria-label={isAdmin ? `Edit or delete event: ${ev.title}` : undefined}
                                                    >
                                                        <p className="font-medium text-[var(--text)] break-words">{ev.title}</p>
                                                        <p className="text-[var(--text-subtle)] mt-1">{ev.date}</p>
                                                    </button>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="card overflow-visible flex flex-col min-w-0 dashboard-section" style={{ animationDelay: '0.25s' }}>
                        <div className="px-5 py-4 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/30">
                            <h2 className="text-base font-semibold text-[var(--text)]">Procurement Progress</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Overview by completion</p>
                        </div>
                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6 min-w-0 overflow-visible items-center sm:items-stretch">
                            <div className="flex flex-col items-center py-4 sm:py-0 flex-shrink-0">
                                <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex-shrink-0 dashboard-pie-container">
                                    <svg viewBox="0 0 100 100" className="w-full h-full dashboard-pie-svg" aria-hidden>
                                        <defs>
                                            <filter id="dashboard-pie-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodOpacity="0.15" />
                                            </filter>
                                            <linearGradient id="pie-completed" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#16a34a" />
                                                <stop offset="100%" stopColor="#22c55e" />
                                            </linearGradient>
                                            <linearGradient id="pie-ongoing" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#fde047" />
                                                <stop offset="100%" stopColor="#facc15" />
                                            </linearGradient>
                                            <linearGradient id="pie-pending" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#e85c5c" />
                                                <stop offset="100%" stopColor="#e03d3d" />
                                            </linearGradient>
                                        </defs>
                                        {total === 0 ? (
                                            <circle cx={cx} cy={cy} r={r} fill="var(--border-light)" stroke="var(--border)" strokeWidth="2" className="dashboard-pie-empty" />
                                        ) : (
                                            <g filter="url(#dashboard-pie-shadow)">
                                                {pieSlices.map((slice, idx) => slice.path && (
                                                    <path
                                                        key={slice.label}
                                                        d={slice.path}
                                                        fill={slice.fill}
                                                        className="dashboard-pie-wedge"
                                                        stroke="rgba(255,255,255,0.4)"
                                                        strokeWidth="1.5"
                                                        transform={hoveredSlice === slice.label ? `translate(${slice.explodeDx}, ${slice.explodeDy})` : undefined}
                                                        style={{
                                                            animationDelay: `${0.35 + idx * 0.1}s`,
                                                        }}
                                                        onMouseEnter={() => setHoveredSlice(slice.label)}
                                                        onMouseLeave={() => setHoveredSlice(null)}
                                                        aria-label={`${slice.label}: ${formatNumber(slice.value)} (${formatNumber(slice.pct, 0)}%)`}
                                                    />
                                                ))}
                                            </g>
                                        )}
                                    </svg>
                                    {hoveredSlice && total > 0 && (() => {
                                        const slice = pieSlices.find((s) => s.label === hoveredSlice);
                                        return slice ? (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 flex flex-nowrap items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border-light)] shadow-lg whitespace-nowrap z-10 pointer-events-none dashboard-pie-tooltip">
                                                <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: slice.color }} aria-hidden />
                                                <span className="text-sm font-medium text-[var(--text)]">{slice.label}</span>
                                                <span className="text-xs text-[var(--text-muted)] tabular-nums">{formatNumber(slice.value)} ({formatNumber(slice.pct, 0)}%)</span>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <div className="w-full min-w-0 flex-1 sm:min-w-[200px] border-t sm:border-t-0 sm:border-l border-[var(--border-light)] pt-6 sm:pt-0 sm:pl-6">
                                <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">Procurement Types</p>
                                <div className="space-y-4" role="img" aria-label="Bar chart: List of Venue, Small Value Procurement, Public Bidding document counts">
                                    {barLabels.map((label, i) => (
                                        <div key={label} className="flex flex-col gap-1.5 min-w-0">
                                            <div className="flex justify-between items-baseline gap-2 min-w-0">
                                                <span className="text-sm font-medium text-[var(--text)] truncate">{label}</span>
                                                <span className="text-sm font-semibold text-[var(--text)] tabular-nums flex-shrink-0">{loading ? '—' : formatNumber(barValues[i])}</span>
                                            </div>
                                            <div className="h-6 w-full rounded-lg bg-[var(--background-subtle)] overflow-hidden border border-[var(--border-light)]">
                                                <div
                                                    className="h-full rounded-l-lg transition-all duration-500 ease-out"
                                                    style={{
                                                        width: barValues[i] > 0 ? `${Math.max((barValues[i] / barMax) * 100, 6)}%` : '0%',
                                                        backgroundColor: barColors[i],
                                                    }}
                                                    aria-hidden
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {eventModal && !confirmAddEvent && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        aria-modal="true"
                        role="dialog"
                    >
                        <div className="card-elevated max-w-sm w-full rounded-2xl border-0 shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                                <h2 className="text-lg font-semibold text-[var(--text)]">Add upcoming event</h2>
                                <button
                                    type="button"
                                    onClick={closeEventModal}
                                    className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                    aria-label="Close"
                                >
                                    <MdClose className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={submitEvent} className="p-6 space-y-4">
                                {eventError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{eventError}</div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Date</label>
                                    <p className="text-[var(--text-muted)]">{eventModal.date}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Event title</label>
                                    <input
                                        type="text"
                                        value={eventTitle}
                                        onChange={(e) => setEventTitle(e.target.value)}
                                        className="input-field w-full"
                                        placeholder="e.g. BAC Meeting"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={closeEventModal} className="btn-secondary flex-1 rounded-xl">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={eventSubmitting} className="btn-primary flex-1 rounded-xl inline-flex items-center justify-center gap-2">
                                        <MdAdd className="w-4 h-4" />
                                        {eventSubmitting ? 'Adding…' : 'Add event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                            {/* Edit event modal (admin: change date/title or delete) */}
                            {editEventModal?.ev && (
                                <div
                                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                    aria-modal="true"
                                    role="dialog"
                                >
                                    <div className="card-elevated max-w-sm w-full rounded-2xl border-0 shadow-2xl overflow-hidden">
                                        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                                            <h2 className="text-lg font-semibold text-[var(--text)] inline-flex items-center gap-2">
                                                <MdEdit className="w-5 h-5" />
                                                Edit event
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={closeEditEventModal}
                                                className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95"
                                                aria-label="Close"
                                            >
                                                <MdClose className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            {editEventError && (
                                                <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{editEventError}</div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Event title</label>
                                                <input
                                                    type="text"
                                                    value={editEventTitle}
                                                    onChange={(e) => setEditEventTitle(e.target.value)}
                                                    className="input-field w-full"
                                                    placeholder="e.g. BAC Meeting"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-1">Date</label>
                                                <input
                                                    type="date"
                                                    value={editEventDate}
                                                    onChange={(e) => setEditEventDate(e.target.value)}
                                                    className="input-field w-full"
                                                />
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ev = editEventModal.ev;
                                                        setEditEventModal(null);
                                                        setConfirmDeleteEvent({ ev, onConfirm: () => performDeleteEvent(ev.id) });
                                                    }}
                                                    disabled={deleteSubmitting}
                                                    className="rounded-xl px-4 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium disabled:opacity-50"
                                                >
                                                    Delete event
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={performUpdateEvent}
                                                    disabled={editEventSubmitting}
                                                    className="btn-primary flex-1 rounded-xl inline-flex items-center justify-center gap-2"
                                                >
                                                    {editEventSubmitting ? 'Saving…' : 'Save changes'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Confirm add event dialog */}
                            {confirmAddEvent && (
                                <div
                                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                    aria-modal="true"
                                    role="alertdialog"
                                    aria-labelledby="dashboard-confirm-event-title"
                                >
                                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                                        <div className="p-6">
                                            <h2 id="dashboard-confirm-event-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                                Confirm
                                            </h2>
                                            <p className="text-[var(--text-muted)] mb-6">{confirmAddEvent.message}</p>
                                            <div className="flex gap-3 justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmAddEvent(null)}
                                                    className="btn-secondary rounded-xl"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => confirmAddEvent.onConfirm()}
                                                    disabled={eventSubmitting}
                                                    className="btn-primary rounded-xl"
                                                >
                                                    {eventSubmitting ? 'Adding…' : 'Yes, add event'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Confirm delete event dialog */}
                            {confirmDeleteEvent && (
                                <div
                                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                                    aria-modal="true"
                                    role="alertdialog"
                                    aria-labelledby="dashboard-confirm-delete-event-title"
                                >
                                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                                        <div className="p-6">
                                            <h2 id="dashboard-confirm-delete-event-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                                Delete event
                                            </h2>
                                            <p className="text-[var(--text-muted)] mb-2">
                                                Delete &quot;{confirmDeleteEvent.ev?.title}&quot; on {confirmDeleteEvent.ev?.date}? This cannot be undone.
                                            </p>
                                            <div className="flex gap-3 justify-end mt-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteEvent(null)}
                                                    disabled={deleteSubmitting}
                                                    className="btn-secondary rounded-xl"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => confirmDeleteEvent.onConfirm()}
                                                    disabled={deleteSubmitting}
                                                    className="rounded-xl px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
                                                >
                                                    {deleteSubmitting ? 'Deleting…' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
            </div>
        </div>
    );
};

export default Dashboard;
