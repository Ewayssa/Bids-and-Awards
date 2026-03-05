import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { auditLogService } from '../services/api';
import { MdHistory, MdRefresh } from 'react-icons/md';

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

    const loadLogs = React.useCallback(async () => {
        setError(null);
        setLoading(true);
        try {
            const data = await auditLogService.getAll();
            setLogs(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Failed to load audit log.');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <div className="space-y-6 pb-10">
            <header className="text-left flex flex-wrap items-center justify-between gap-4">
                <PageHeader
                    title="Audit Trail"
                    subtitle="Important system actions. Only significant events are recorded."
                    titleSize="default"
                />
                <button
                    type="button"
                    onClick={() => loadLogs()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--background-subtle)] disabled:opacity-50 text-sm font-medium"
                >
                    <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--primary)] border-t-transparent" />
                </div>
            ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--background-subtle)]">
                                    <th className="px-4 py-3 font-semibold text-[var(--text)]">Date &amp; time</th>
                                    <th className="px-4 py-3 font-semibold text-[var(--text)]">Action</th>
                                    <th className="px-4 py-3 font-semibold text-[var(--text)]">User</th>
                                    <th className="px-4 py-3 font-semibold text-[var(--text)]">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">
                                            <MdHistory className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            No audit entries yet.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((entry) => (
                                        <tr
                                            key={entry.id != null ? String(entry.id) : entry.created_at + (entry.actor || '')}
                                            className="border-b border-[var(--border-light)] last:border-b-0 hover:bg-[var(--background-subtle)]/50"
                                        >
                                            <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                                                {formatDate(entry.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-[var(--text)]">
                                                    {ACTION_LABELS[entry.action] || entry.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[var(--text)]">{entry.actor || '—'}</td>
                                            <td className="px-4 py-3 text-[var(--text-muted)] max-w-xs truncate" title={entry.description}>
                                                {entry.description || (entry.target_type && entry.target_id ? `${entry.target_type} ${entry.target_id}` : '—')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditTrail;
