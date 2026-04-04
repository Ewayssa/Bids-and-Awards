import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdNotifications } from 'react-icons/md';
import { notificationService } from '../services/api';

const NotificationBell = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const list = await notificationService.getAll();
                if (!cancelled && Array.isArray(list)) {
                    const filtered = isAdmin ? list : list.filter((n) => !n.admin_only);
                    setNotifications(filtered);
                }
            } catch {
                if (!cancelled) setNotifications([]);
            }
        };

        // Initial load (and when route changes)
        fetchNotifications();

        // Poll every 15 seconds for near real-time updates
        const intervalId = setInterval(fetchNotifications, 15000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [location.pathname, isAdmin]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleNotificationClick = (n) => {
        if (!n.read) {
            notificationService.markRead(n.id).then(() => {
                setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
            }).catch(() => {});
        }
        if (n.link) navigate(n.link);
        setOpen(false);
    };

    const markAllRead = () => {
        notificationService.markAllRead().then(() => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }).catch(() => {});
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--background-subtle)_50%,transparent)] hover:text-[var(--text)] transition-all duration-300 ease-out relative group"
                aria-label="Notifications"
                aria-expanded={open}
            >
                <MdNotifications className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-[var(--background)] shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-3 z-[9999] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300" role="dialog" aria-label="Notifications">
                        <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[color-mix(in_srgb,var(--background-subtle)_30%,transparent)]">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text)]">Notifications</h3>
                                {unreadCount > 0 && (
                                    <p className="text-[10px] text-[var(--primary)] font-semibold uppercase tracking-wider mt-0.5">
                                        {unreadCount} UNREAD
                                    </p>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors px-2 py-1 rounded-md hover:bg-[color-mix(in_srgb,var(--primary-muted)_20%,transparent)]">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto scrollbar-thin">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center">
                                    <MdNotifications className="w-10 h-10 text-[var(--border)] mx-auto mb-3" />
                                    <p className="text-sm text-[var(--text-muted)] font-medium">No notifications yet</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[var(--border-light)]">
                                    {notifications.map((n) => (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleNotificationClick(n)}
                                                className={`w-full text-left px-5 py-4 hover:bg-[var(--background-subtle)] transition-all duration-200 group relative ${!n.read ? 'bg-[color-mix(in_srgb,var(--primary-muted)_10%,transparent)]' : ''}`}
                                            >
                                                {!n.read && (
                                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--primary)] rounded-full opacity-60 group-hover:opacity-100" />
                                                )}
                                                <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <p className="text-[10px] font-medium text-[var(--text-subtle)] uppercase tracking-wider">
                                                        {n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </p>
                                                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />}
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="p-3 bg-[color-mix(in_srgb,var(--background-subtle)_30%,transparent)] border-t border-[var(--border-light)] text-center">
                            <button className="text-[11px] font-bold text-[var(--text-subtle)] hover:text-[var(--primary)] transition-colors uppercase tracking-widest">
                                View all history
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
