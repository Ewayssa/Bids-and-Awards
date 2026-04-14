import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { auditLogService } from '../../services/api';
import { MdHistory, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { formatDisplayDateTime } from '../../utils/helpers.jsx';

const TABLE_PAGE_SIZE = 10;

const ACTION_LABELS = {
    user_login: 'Login',
    user_registered: 'Account created',
    password_changed: 'Change password',
    password_reset: 'Password reset',
    user_created: 'Added new user',
    user_updated: 'User updated',
    user_deleted: 'User deleted',
    document_created: 'Upload new procurement',
    document_updated: 'Update existing procurement',
    document_completed: 'Document completed',
    document_deleted: 'Document deleted',
    report_created: 'Upload report',
    report_updated: 'Report updated',
    report_deleted: 'Report deleted',
    calendar_event_created: 'Calendar event created',
    calendar_event_updated: 'Calendar event updated',
    calendar_event_deleted: 'Calendar event deleted',
    backup_exported: 'Back up',
    restore_completed: 'Restore',
};

const formatDate = (iso) => formatDisplayDateTime(iso) || '—';

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
            // Backend returns { count, results, ... } due to pagination
            const logList = Array.isArray(data) ? data : (data?.results || []);
            setLogs(logList);
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

    // Auto-refresh so new activities appear without leaving the page
    useEffect(() => {
        const interval = setInterval(loadLogs, 5000);
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

            <section className="content-section overflow-hidden rounded-[var(--radius-lg)] p-0">
                {error && (
                    <div className={`alert-error rounded-none ${!loading ? 'rounded-t-[var(--radius-lg)]' : ''} border-x-0 border-t-0`} role="alert">
                        {error}
                    </div>
                )}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                        <div className="h-10 w-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" aria-hidden />
                        <p className="text-sm mt-4 m-0">Loading activity logs…</p>
                    </div>
                ) : (
                    <>
                        <div className={`section-header flex flex-wrap items-center justify-between gap-3 ${error ? 'section-header--nested' : ''}`}>
                            <div>
                                <h2 className="text-base sm:text-lg font-semibold text-[var(--text)] m-0">Activity Logs</h2>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5 m-0">Only significant events are recorded. Refreshes automatically.</p>
                            </div>
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
                                            className="hover:bg-[var(--background-subtle)]/50 transition-colors duration-200 group"
                                        >
                                            <td className="table-td">{entry.actor || '—'}</td>
                                            <td className="table-td text-center">
                                                <span className="inline-flex justify-center items-center px-2.5 py-1 rounded-lg bg-[var(--background-subtle)] text-[var(--text)] text-xs font-semibold border border-[var(--border-light)] max-w-full group-hover:border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] transition-colors">
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
                        <div className="pagination-nav">
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                disabled={tablePage <= 1}
                                className="pagination-btn"
                                aria-label="Previous page"
                            >
                                <MdChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="pagination-info">
                                Page {tablePage} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                                disabled={tablePage >= totalPages}
                                className="pagination-btn"
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
