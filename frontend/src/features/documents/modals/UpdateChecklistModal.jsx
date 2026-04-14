import React from 'react';
import { MdLibraryBooks, MdCheckCircle, MdPendingActions, MdEditDocument } from 'react-icons/md';
import Modal from '../../../components/Modal';

const UpdateChecklistModal = ({
    isOpen,
    onClose,
    loading,
    documents,
    updateChecklistData,
    onSubDocClick
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Procurements"
            size="lg"
            showCloseButton={true}
        >
            <div className="flex flex-col space-y-6">
                <div className="alert-info items-start">
                    <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-light)] text-[var(--primary)] shrink-0">
                        <MdLibraryBooks className="w-5 h-5" aria-hidden />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--text)] m-0">Document management</p>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium mt-1 m-0">
                            Only documents you uploaded can be updated. Select an item below to modify details or upload a new version.
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-4" aria-hidden />
                            <p className="font-semibold m-0">Syncing records</p>
                            <p className="text-sm opacity-80 m-0 mt-1">Fetching latest document statuses…</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-[var(--background-subtle)]/50 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)]">
                            <p className="font-bold">No documents uploaded yet</p>
                            <p className="text-sm opacity-60">Upload some documents to see them here.</p>
                        </div>
                    ) : (
                        updateChecklistData.map((docType) => {
                            const subs = docType.subDocsWithStatus || [];
                            const completed = subs.filter((s) => s.done).length;
                            const total = subs.length;
                            const isFullyComplete = completed === total && total > 0;

                            return (
                                <div
                                    key={docType.id}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow"
                                >
                                    <div className={`px-5 py-3 border-b border-[var(--border-light)] flex items-center justify-between ${isFullyComplete ? 'bg-[var(--primary-muted)]/40' : 'bg-[var(--background-subtle)]/40'}`}>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text)] m-0">{docType.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex h-1.5 w-24 bg-[var(--border)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--primary)] transition-all duration-500"
                                                        style={{ width: `${(completed / total) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">{completed}/{total} complete</span>
                                            </div>
                                        </div>
                                        {isFullyComplete && <MdCheckCircle className="text-[var(--primary)] w-5 h-5 shrink-0" aria-hidden />}
                                    </div>
                                    <ul className="divide-y divide-[var(--border-light)]">
                                        {subs.map((sub) => {
                                            const hasDoc = !!sub.doc;
                                            const canClick = hasDoc && sub.canUpdate;
                                            const status = sub.done ? 'complete' : hasDoc ? 'ongoing' : 'pending';
                                            
                                            return (
                                                <li key={`${docType.id}-${sub.name}`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => canClick && onSubDocClick(sub)}
                                                        disabled={!canClick}
                                                        className={`w-full px-5 py-3 flex items-center justify-between gap-4 text-left transition-colors ${canClick ? 'hover:bg-[var(--primary-muted)]/30 cursor-pointer group' : 'cursor-not-allowed opacity-60'}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                                                status === 'complete' ? 'bg-[var(--primary-muted)] text-[var(--primary)]' :
                                                                status === 'ongoing' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' :
                                                                'bg-[var(--background-subtle)] text-[var(--text-subtle)]'
                                                            }`}>
                                                                {status === 'complete' ? <MdCheckCircle className="w-5 h-5" /> : 
                                                                 status === 'ongoing' ? <MdPendingActions className="w-5 h-5" /> :
                                                                 <MdEditDocument className="w-5 h-5" />}
                                                            </div>
                                                            <span className={`font-medium text-sm truncate ${canClick ? 'text-[var(--text)] group-hover:text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                                                {sub.name}
                                                            </span>
                                                        </div>
                                                        <div className={`shrink-0 text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${
                                                            status === 'complete' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                            status === 'ongoing' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                                            'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                        }`}>
                                                            {status === 'complete' ? 'Completed' : status === 'ongoing' ? 'Modify' : 'Pending'}
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </Modal>
    );
};

export default UpdateChecklistModal;
