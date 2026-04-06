import React, { useState, useRef } from 'react';
import { MdBackup, MdRestore, MdWarning, MdCheckCircle } from 'react-icons/md';
import PageHeader from '../components/PageHeader';
import { backupRestoreService } from '../services/api';
import Modal from '../components/Modal';

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
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-4 text-emerald-700 dark:text-emerald-400">
                            <MdCheckCircle className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold uppercase tracking-tight">{message}</p>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-4 text-red-700 dark:text-red-400 mt-4">
                            <MdWarning className="w-6 h-6 shrink-0" />
                            <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Backup Card */}
                <div className="group relative p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <MdBackup className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">System Backup</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                        Export all database records, user profiles, and document metadata into a standardized JSON file for offline storage.
                    </p>
                    <button
                        onClick={() => setConfirmBackup(true)}
                        disabled={backingUp}
                        className="w-full py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {backingUp ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdBackup className="w-5 h-5" />}
                        Create Backup
                    </button>
                </div>

                {/* Restore Card */}
                <div className="group relative p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <MdRestore className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">System Restore</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
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
                        onClick={() => fileInputRef.current?.click()}
                        disabled={restoring}
                        className="w-full py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        {restoring ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <MdRestore className="w-5 h-5" />}
                        Restore Backup
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
                <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                        <MdBackup className="w-8 h-8 text-blue-600 shrink-0" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            Download a full metadata snapshot of all procurement activities and user records?
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmBackup(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                            Cancel
                        </button>
                        <button onClick={performBackup} className="flex-1 py-3.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95">
                            Download Backup
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
                <div className="p-2 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-200 dark:border-red-500/20 text-red-600">
                        <MdWarning className="w-10 h-10 shrink-0" />
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight">Destructive Action</p>
                            <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                                Restoring from "{confirmRestore?.file?.name}" will synchronize the current database with the archive.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmRestore(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                            Cancel
                        </button>
                        <button onClick={performRestore} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20">
                            Restore Data
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
