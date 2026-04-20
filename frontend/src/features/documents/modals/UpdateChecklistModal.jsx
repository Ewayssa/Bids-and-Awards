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
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600 dark:text-blue-400">
                            <MdLibraryBooks className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Document Management</p>
                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium mt-1">
                                Only documents you uploaded can be updated. Select a document below to modify its details or upload a new version.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-emerald-500 animate-spin mb-4" />
                            <p className="font-bold">Syncing Records</p>
                            <p className="text-sm opacity-60">Fetching latest document statuses...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50 text-[var(--text-muted)]">
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
                                    className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between ${isFullyComplete ? 'bg-emerald-50/30' : 'bg-slate-50/50 dark:bg-slate-800/80'}`}>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{docType.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex h-1.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500 transition-all duration-500" 
                                                        style={{ width: `${(completed / total) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{completed}/{total} Complete</span>
                                            </div>
                                        </div>
                                        {isFullyComplete && <MdCheckCircle className="text-emerald-500 w-5 h-5" />}
                                    </div>
                                    <ul className="divide-y divide-slate-50 dark:divide-slate-700/30">
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
                                                        className={`w-full px-5 py-3 flex items-center justify-between gap-4 text-left transition-all ${canClick ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 cursor-pointer group' : 'cursor-not-allowed grayscale'}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                                                status === 'complete' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                                                status === 'ongoing' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                                'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                            }`}>
                                                                {status === 'complete' ? <MdCheckCircle className="w-5 h-5" /> : 
                                                                 status === 'ongoing' ? <MdPendingActions className="w-5 h-5" /> :
                                                                 <MdEditDocument className="w-5 h-5" />}
                                                            </div>
                                                            <span className={`font-bold text-sm truncate ${canClick ? 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400' : 'text-slate-400'}`}>
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
