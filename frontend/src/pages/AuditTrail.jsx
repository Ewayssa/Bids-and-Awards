import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { auditLogService } from '../services/api';
import { MdHistory, MdRefresh, MdChevronLeft, MdChevronRight } from 'react-icons/md';

const TABLE_PAGE_SIZE = 5;

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
    report_deleted: 'Report deleted',
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

    const totalPages = Math.max(1, Math.ceil(logs.length / TABLE_PAGE_SIZE));
    const paginatedLogs = logs.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);

    useEffect(() => {
        setTablePage(1);
    }, [logs.length]);

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title="Activity Logs"
                subtitle="Important system activities. Only significant events are recorded."
                titleSize="default"
            />

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="card rounded-xl flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--primary)] border-t-transparent" />
                    <p className="text-sm text-[var(--text-muted)] mt-4">Loading activity logs…</p>
                </div>
            ) : (
                <section className="content-section">
                    <div className="section-header flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text)]">Activity Logs</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Only significant events are recorded.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => loadLogs()}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--background-subtle)] disabled:opacity-50 text-sm font-medium shadow-sm"
                        >
                            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border)] w-full">
                            <thead className="table-header">
                                <tr>
                                    <th className="table-th">Date &amp; time</th>
                                    <th className="table-th">Action</th>
                                    <th className="table-th">User</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--surface)] divide-y divide-[var(--border-light)]">
                                {logs.length === 0 ? (
                                    <tr>
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
                                            <td className="table-td-muted whitespace-nowrap">
                                                {formatDate(entry.created_at)}
                                            </td>
                                            <td className="table-td">
                                                <span className="font-medium text-[var(--text)]">
                                                    {ACTION_LABELS[entry.action] || entry.action}
                                                </span>
                                            </td>
                                            <td className="table-td">{entry.actor || '—'}</td>
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
                </section>
            )}
        </div>
    );
};

export default AuditTrail;
