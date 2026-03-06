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
                className="p-2.5 rounded-xl text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-300 ease-out relative"
                aria-label="Notifications"
                aria-expanded={open}
            >
                <MdNotifications className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-[9998]" aria-hidden onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-[9999] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden" role="dialog" aria-label="Notifications">
                        <div className="p-3 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--background-subtle)]/50">
                            <span className="text-sm font-semibold text-[var(--text)]">Notifications</span>
                            {unreadCount > 0 && (
                                <button type="button" onClick={markAllRead} className="text-xs text-[var(--primary)] hover:underline">
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="p-4 text-sm text-[var(--text-muted)]">No notifications yet.</p>
                            ) : (
                                <ul className="divide-y divide-[var(--border-light)]">
                                    {notifications.map((n) => (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleNotificationClick(n)}
                                                className={`w-full text-left px-4 py-3 hover:bg-[var(--background-subtle)] transition-colors ${!n.read ? 'bg-[var(--primary-muted)]/30' : ''}`}
                                            >
                                                <p className="text-sm font-medium text-[var(--text)]">{n.message}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                                </p>
                                                {!n.read && <span className="inline-block w-2 h-2 rounded-full bg-[var(--primary)] mt-1" aria-label="Unread" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
