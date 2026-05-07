import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MdClose, MdEvent } from 'react-icons/md';
import { notificationService } from '../../services/api';
import { formatDisplayDateTime } from '../../utils/helpers';

const DISMISSED_KEY = 'notification_toast_dismissed';

const getDismissedIds = () => {
    try {
        return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]'));
    } catch {
        return new Set();
    }
};

const saveDismissedIds = (ids) => {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
};

const NotificationToast = ({ user }) => {
    const location = useLocation();
    const [notifications, setNotifications] = useState([]);
    const [dismissedIds, setDismissedIds] = useState(() => getDismissedIds());

    useEffect(() => {
        if (!user) return undefined;

        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const list = await notificationService.getAll();
                if (!cancelled && Array.isArray(list)) {
                    setNotifications(list);
                }
            } catch {
                if (!cancelled) setNotifications([]);
            }
        };

        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 15000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [location.pathname, user]);

    const unreadNotifications = useMemo(() => (
        notifications
            .filter((n) => !n.read && !dismissedIds.has(String(n.id)))
            .slice(0, 3)
    ), [notifications, dismissedIds]);

    const dismiss = (id) => {
        setDismissedIds((prev) => {
            const next = new Set(prev);
            next.add(String(id));
            saveDismissedIds(next);
            return next;
        });
    };

    if (unreadNotifications.length === 0) return null;

    return (
        <div className="fixed right-4 bottom-5 z-[9997] w-[min(24rem,calc(100vw-2rem))] space-y-3 pointer-events-none">
            {unreadNotifications.map((notification) => (
                <div
                    key={notification.id}
                    className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white shadow-2xl shadow-slate-900/15 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"
                    role="status"
                >
                    <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <MdEvent className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                                New Notification
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-snug m-0">
                                {notification.message}
                            </p>
                            {notification.created_at && (
                                <p className="text-[11px] font-semibold text-slate-400 mt-2 m-0">
                                    {formatDisplayDateTime(notification.created_at)}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => dismiss(notification.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            aria-label="Dismiss meeting reminder"
                        >
                            <MdClose className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NotificationToast;
