import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

const UpdateChecklistModal = ({
    isOpen,
    onClose,
    loading,
    documents,
    updateChecklistData,
    onSubDocClick
}) => {
    useEffect(() => {
        if (isOpen) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300 shadow-2xl"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl border-0 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between sticky top-0 bg-[var(--surface)] rounded-t-2xl z-10">
                    <h2 className="text-lg font-semibold text-[var(--text)]">
                        Update Documents
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-1"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] mx-auto mb-3" />
                            <p className="text-sm text-[var(--text-muted)]">Loading documents...</p>
                        </div>
                    ) : (
                        <>
                            {documents.length === 0 && (
                                <p className="text-sm text-[var(--text-muted)] text-center rounded-xl bg-[var(--background-subtle)] px-4 py-3">
                                    No documents uploaded yet.
                                </p>
                            )}

                            {/* Document checklist – grouped by document type, click a document to update it */}
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                <p className="text-xs text-[var(--text-muted)] font-medium">Only documents you uploaded can be updated. Click a document to update it.</p>
                                {updateChecklistData.map((docType) => {
                                    const subs = docType.subDocsWithStatus || [];
                                    const completed = subs.filter((s) => s.done).length;
                                    const ongoing = subs.filter((s) => !s.done && s.doc).length;
                                    const pending = subs.filter((s) => !s.doc).length;
                                    const total = subs.length;
                                    return (
                                        <div
                                            key={docType.id}
                                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm"
                                        >
                                            <div className="px-4 py-3 bg-[var(--primary)]/10 border-b border-[var(--border)]">
                                                <p className="text-sm font-semibold text-[var(--text)]">{docType.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    {total} document{total !== 1 ? 's' : ''}:{' '}
                                                    <span className="text-green-700 font-medium">{completed} Complete</span>
                                                    {ongoing > 0 && <><span className="text-[var(--text-muted)]"> · </span><span className="text-amber-700 font-medium">{ongoing} Ongoing</span></>}
                                                    {pending > 0 && <><span className="text-[var(--text-muted)]"> · </span><span className="text-[var(--text-muted)] font-medium">{pending} Pending</span></>}
                                                </p>
                                            </div>
                                            <ul className="divide-y divide-[var(--border)]">
                                                {subs.map((sub) => {
                                                    const hasDoc = !!sub.doc;
                                                    const status = sub.done ? 'complete' : hasDoc ? 'ongoing' : 'pending';
                                                    return (
                                                        <li key={`${docType.id}-${sub.name}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => hasDoc && sub.canUpdate && onSubDocClick(sub)}
                                                                disabled={!hasDoc || !sub.canUpdate}
                                                                className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors text-sm ${hasDoc && sub.canUpdate ? 'hover:bg-[var(--primary-muted)]/30 cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                                            >
                                                                <span className="font-medium text-[var(--text)] truncate">{sub.name}</span>
                                                                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                    status === 'complete' ? 'bg-green-100 text-green-800' :
                                                                    status === 'ongoing' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-[var(--background-subtle)] text-[var(--text-muted)]'
                                                                }`}>
                                                                    {status === 'complete' ? 'Complete' : status === 'ongoing' ? 'Ongoing' : 'Not started'}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default UpdateChecklistModal;
