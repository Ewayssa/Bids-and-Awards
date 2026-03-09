import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { auditLogService } from '../services/api';
import { MdHistory, MdRefresh, MdChevronLeft, MdChevronRight } from 'react-icons/md';

const TABLE_PAGE_SIZE = 10;

const ACTION_LABELS = {
    user_login: 'Login',
    user_registered: 'Registration',
    password_changed: 'Password changed',
    password_reset: 'Password reset',
    user_created: 'User created',
    user_updated: 'User updated',
    user_deleted: 'User deleted',
    document_created: 'Document created',
    document_updated: 'Document updated',
    document_completed: 'Document completed',
    document_deleted: 'Document deleted',
    report_created: 'Report created',
    report_updated: 'Report updated',
    report_deleted: 'Report deleted',
    calendar_event_created: 'Calendar event created',
    calendar_event_updated: 'Calendar event updated',
    calendar_event_deleted: 'Calendar event deleted',
    backup_exported: 'Backup exported',
    restore_completed: 'Restore completed',
};

const formatDate = (iso) => {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    } catch {
        return iso;
    }
};

const AuditTrail = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tablePage, setTablePage] = useState(1);

    const loadLogs = React.useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const data = await auditLogService.getAll();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to load activity logs.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Auto-refresh every 30 seconds so new activities appear without leaving the page
    useEffect(() => {
        const interval = setInterval(loadLogs, 30000);
        return () => clearInterval(interval);
    }, [loadLogs]);

    const totalPages = Math.max(1, Math.ceil(logs.length / TABLE_PAGE_SIZE));
    const paginatedLogs = logs.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

    useEffect(() => {
        setTablePage(1);
    }, [logs.length]);

    return (
        <div className="space-y-5 pb-8">
            <PageHeader
                title="Activity Logs"
                subtitle="Important system activities. Only significant events are recorded."
                titleSize="default"
            />

            <section className="content-section overflow-hidden rounded-xl p-0">
                {error && (
                    <div className="rounded-t-xl border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--primary)] border-t-transparent" />
                        <p className="text-sm text-[var(--text-muted)] mt-4">Loading activity logs…</p>
                    </div>
                ) : (
                    <>
                        <div className={`section-header flex flex-wrap items-center justify-between gap-3 ${error ? 'section-header--nested' : ''}`}>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">Activity Logs</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Only significant events are recorded. Refreshes every 30s.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => loadLogs()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--background-subtle)] disabled:opacity-50 text-sm font-medium text-[var(--text)]"
                            aria-label="Refresh activity logs"
                        >
                            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full w-full divide-y divide-[var(--border)]" style={{ tableLayout: 'fixed' }}>
                            <thead className="table-header">
                                <tr>
                                    <th className="table-th" style={{ width: '25%' }}>User</th>
                                    <th className="table-th text-center" style={{ width: '50%' }}>Action</th>
                                    <th className="table-th whitespace-nowrap" style={{ width: '25%' }}>Date and time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                {logs.length === 0 ? (
                                    <tr key="empty">
                                        <td colSpan={3} className="table-td text-center py-12 text-[var(--text-muted)]">
                                            <MdHistory className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            No audit entries yet.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((entry) => (
                                        <tr
                                            key={entry.id != null ? String(entry.id) : entry.created_at + (entry.actor || '')}
                                            className="hover:bg-[var(--background-subtle)]/50 transition-all duration-300 ease-out group"
                                        >
                                            <td className="table-td">{entry.actor || '—'}</td>
                                            <td className="table-td text-center">
                                                <span className="inline-flex justify-center items-center w-full font-medium text-[var(--text)]">
                                                    {ACTION_LABELS[entry.action] || entry.action}
                                                </span>
                                            </td>
                                            <td className="table-td-muted whitespace-nowrap">
                                                {formatDate(entry.created_at)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {logs.length > TABLE_PAGE_SIZE && (
                        <div className="flex items-center justify-center gap-3 py-3 border-t border-[var(--border)] bg-[var(--background-subtle)]/50">
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                disabled={tablePage <= 1}
                                className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                aria-label="Previous page"
                            >
                                <MdChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-[var(--text-muted)]">
                                Page {tablePage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                                disabled={tablePage >= totalPages}
                                className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)]"
                                aria-label="Next page"
                            >
                                <MdChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    </>
                )}
            </section>
        </div>
    );
};

export default AuditTrail;
