import React, { useState, useRef } from 'react';
import { MdBackup, MdRestore } from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import { backupRestoreService } from '../services/api';

const Settings = () => {
    const [backingUp, setBackingUp] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [confirmBackup, setConfirmBackup] = useState(false);
    const [confirmRestore, setConfirmRestore] = useState(null);
    const fileInputRef = useRef(null);

    const performBackup = async () => {
        setConfirmBackup(false);
        setError(null);
        setMessage(null);
        setBackingUp(true);
        try {
            const data = await backupRestoreService.backup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bac-records-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage('Records backup saved. Events, users, and all document/report metadata are in the JSON file. For full recovery, also back up the server\'s media folder and database.');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Backup failed.');
        } finally {
            setBackingUp(false);
        }
    };

    const handleBackup = () => setConfirmBackup(true);

    const handleRestoreFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setConfirmRestore({ file });
        e.target.value = '';
    };

    const performRestore = async () => {
        if (!confirmRestore?.file) return;
        const file = confirmRestore.file;
        setConfirmRestore(null);
        setError(null);
        setMessage(null);
        setRestoring(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await backupRestoreService.restore(data);
            setMessage(result?.detail || 'Restore completed.');
            if (result?.restored) {
                setMessage((m) => {
                    const r = result.restored;
                    const parts = [m];
                    if (r.calendarEvents != null) parts.push(`Events: ${r.calendarEvents}`);
                    if (r.users != null) parts.push(`Users: ${r.users}`);
                    if (r.documents != null) parts.push(`Documents: ${r.documents}`);
                    if (r.reports != null) parts.push(`Reports: ${r.reports}`);
                    return parts.join('. ');
                });
            }
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Restore failed. Check file format.');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <header className="text-left">
                <PageHeader
                    title="Settings"
                    subtitle="Backup and restore system data."
                    titleSize="default"
                />
            </header>

            {(message || error) && (
                <div className="space-y-3">
                    {message && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-3 shadow-sm">
                            <MdBackup className="w-5 h-5 text-green-600 shrink-0" />
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                            {error}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 justify-items-center max-w-3xl lg:max-w-4xl mx-auto">
                {/* Backup */}
                <section className="card overflow-hidden min-w-0 w-full">
                    <div className="px-6 py-5 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/30 flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-muted)] text-[var(--primary)]">
                            <MdBackup className="w-6 h-6" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-[var(--text)]">Backup</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Save system data to a file</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                            Save all database records to a JSON file: calendar events, users (no passwords), and full document & report metadata. Uploaded PDFs stay on the server; back up the media folder separately for full recovery.
                        </p>
                        <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={handleBackup}
                            disabled={backingUp}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2.5 px-5 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            <MdBackup className="w-4 h-4" />
                            {backingUp ? 'Saving…' : 'Save Backup'}
                        </button>
                        </div>
                    </div>
                </section>

                {/* Restore */}
                <section className="card overflow-hidden min-w-0 w-full">
                    <div className="px-6 py-5 border-b border-[var(--border-light)] bg-[var(--background-subtle)]/30 flex items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <MdRestore className="w-6 h-6" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-[var(--text)]">Restore</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Load data from a backup file</p>
                        </div>
                    </div>
                    <div className="p-6">
                            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                                Restore events, user status, and document/report metadata from a previously saved JSON backup. Use a backup from this system; existing records are updated by ID.
                            </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleRestoreFileSelect}
                            className="hidden"
                            aria-hidden
                        />
                        <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={restoring}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2.5 px-5 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                            <MdRestore className="w-4 h-4" />
                            {restoring ? 'Restoring…' : 'Restore from Backup'}
                        </button>
                        </div>
                    </div>
                </section>
            </div>

            {/* Confirm backup modal */}
            {confirmBackup && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-labelledby="settings-confirm-backup-title"
                >
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6">
                            <h2 id="settings-confirm-backup-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                Save records backup
                            </h2>
                            <p className="text-[var(--text-muted)] mb-6">
                                Download a JSON backup of all events, users, and document/report records (metadata only; file contents stay on the server)?
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setConfirmBackup(false)} className="btn-secondary rounded-xl">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={performBackup}
                                    disabled={backingUp}
                                    className="btn-primary rounded-xl"
                                >
                                    {backingUp ? 'Saving…' : 'Yes, save all'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm restore modal */}
            {confirmRestore && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="alertdialog"
                    aria-labelledby="settings-confirm-restore-title"
                >
                    <div className="card-elevated max-w-sm w-full shadow-2xl rounded-2xl border-0 overflow-hidden">
                        <div className="p-6">
                            <h2 id="settings-confirm-restore-title" className="text-lg font-semibold text-[var(--text)] mb-2">
                                Restore from backup
                            </h2>
                            <p className="text-[var(--text-muted)] mb-6">
                                Restore events, user status, and document/report metadata from &quot;{confirmRestore.file.name}&quot;? This may overwrite current data.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setConfirmRestore(null)} className="btn-secondary rounded-xl">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={performRestore}
                                    disabled={restoring}
                                    className="btn-primary rounded-xl"
                                >
                                    {restoring ? 'Restoring…' : 'Yes, restore'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
