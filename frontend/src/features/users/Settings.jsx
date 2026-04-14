import React, { useState, useRef } from 'react';
import { MdBackup, MdRestore, MdWarning, MdCheckCircle } from 'react-icons/md';
import PageHeader from '../../components/PageHeader';
import { backupRestoreService } from '../../services/api';
import Modal from '../../components/Modal';

const Settings = ({ user }) => {
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
            const actor = (user?.username || user?.fullName || '').trim();
            const data = await backupRestoreService.backup(actor);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bac-records-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage('Records backup saved successfully.');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Backup failed.');
        } finally {
            setBackingUp(false);
        }
    };

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
            const actor = (user?.username || user?.fullName || '').trim();
            const result = await backupRestoreService.restore(data, actor);
            setMessage(result?.detail || 'Restore completed.');
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Restore failed.');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <PageHeader
                title="System Settings"
                subtitle="Manage system backups and data recovery."
            />

            {(message || error) && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
                    {message && (
                        <div className="alert-success" role="status">
                            <MdCheckCircle className="w-5 h-5 shrink-0 text-emerald-600" aria-hidden />
                            <p className="text-sm font-medium m-0">{message}</p>
                        </div>
                    )}
                    {error && (
                        <div className={`alert-error ${message ? 'mt-4' : ''}`} role="alert">
                            <MdWarning className="w-5 h-5 shrink-0" aria-hidden />
                            <p className="text-sm font-medium m-0">{error}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {/* Backup Card */}
                <div className="card p-8 group">
                    <div className="w-14 h-14 rounded-xl bg-[var(--background-subtle)] border border-[var(--border-light)] flex items-center justify-center text-[var(--primary)] mb-5">
                        <MdBackup className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text)] tracking-tight mb-2">System backup</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
                        Export all database records, user profiles, and document metadata into a standardized JSON file for offline storage.
                    </p>
                    <button
                        type="button"
                        onClick={() => setConfirmBackup(true)}
                        disabled={backingUp}
                        className="btn-primary btn-lg w-full inline-flex items-center justify-center gap-3"
                    >
                        {backingUp ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden /> : <MdBackup className="w-5 h-5" />}
                        Create backup
                    </button>
                </div>

                {/* Restore Card */}
                <div className="card p-8 group">
                    <div className="w-14 h-14 rounded-xl bg-[var(--primary-muted)] border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))] flex items-center justify-center text-[var(--primary)] mb-5">
                        <MdRestore className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-semibold text-[var(--text)] tracking-tight mb-2">System restore</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed">
                        Import system archives to restore operational state. This process will synchronize metadata and user permissions with the archived snapshot.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleRestoreFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={restoring}
                        className="btn-primary btn-lg w-full inline-flex items-center justify-center gap-3"
                    >
                        {restoring ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden /> : <MdRestore className="w-5 h-5" />}
                        Restore backup
                    </button>
                </div>
            </div>

            {/* Confirm Backup Modal */}
            <Modal
                isOpen={confirmBackup}
                onClose={() => setConfirmBackup(false)}
                title="Backup Confirmation"
                size="md"
            >
                <div className="space-y-6">
                    <div className="alert-info">
                        <MdBackup className="w-5 h-5 shrink-0 text-blue-600" aria-hidden />
                        <p className="text-sm font-medium m-0">
                            Download a full metadata snapshot of all procurement activities and user records?
                        </p>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setConfirmBackup(false)} className="btn-secondary flex-1 justify-center">
                            Cancel
                        </button>
                        <button type="button" onClick={performBackup} className="btn-primary flex-1 justify-center">
                            Download backup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Restore Modal */}
            <Modal
                isOpen={!!confirmRestore}
                onClose={() => setConfirmRestore(null)}
                title="Recovery Warning"
                size="md"
            >
                <div className="space-y-6">
                    <div className="alert-error">
                        <MdWarning className="w-6 h-6 shrink-0" aria-hidden />
                        <div>
                            <p className="text-sm font-semibold m-0">Destructive action</p>
                            <p className="text-xs text-red-800/90 mt-1.5 m-0">
                                Restoring from &quot;{confirmRestore?.file?.name}&quot; will synchronize the current database with the archive.
                            </p>
                        </div>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setConfirmRestore(null)} className="btn-secondary flex-1 justify-center">
                            Cancel
                        </button>
                        <button type="button" onClick={performRestore} className="btn-danger flex-1 justify-center">
                            Restore data
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
