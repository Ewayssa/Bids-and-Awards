import React from 'react';
import { MdFolder, MdDescription, MdDownload, MdWarning } from 'react-icons/md';
import Modal from '../../../components/Modal';
import { DocDetailsView } from '../DocDetailsView';

const DocViewModal = ({ doc, onClose }) => {
    return (
        <Modal
            isOpen={!!doc}
            onClose={onClose}
            title="Document Details"
            size="lg"
            showCloseButton={true}
        >
            <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl shadow-[var(--shadow-sm)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <DocDetailsView doc={doc} />
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--background-subtle)]/50 space-y-3">
                            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5 m-0">
                                <MdFolder className="text-[var(--primary)] w-4 h-4" aria-hidden />
                                File attachment
                            </h3>

                            {doc?.file_url ? (
                                <div className="flex flex-col space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-[var(--surface)] border border-[var(--border-light)] rounded-xl shadow-sm">
                                        <div className="p-2.5 rounded-lg bg-[var(--primary-muted)] text-[var(--primary)]">
                                            <MdDescription className="w-6 h-6" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-[var(--text)] truncate" title={doc.title}>
                                                {doc.title || 'Attached Document'}
                                            </p>
                                        </div>
                                    </div>

                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary w-full py-2.5 justify-center inline-flex items-center gap-2 text-sm"
                                    >
                                        <MdDownload className="w-4 h-4" aria-hidden />
                                        Download / View
                                    </a>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-amber-200 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/5 text-center">
                                    <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 mb-3">
                                        <MdWarning className="w-6 h-6" aria-hidden />
                                    </div>
                                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 m-0">No file uploaded</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 m-0">This entry does not have an attachment yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--primary-muted)]/40 text-sm text-[var(--text-muted)] leading-relaxed">
                            Details reflect the latest submission. For history, check the document trail.
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DocViewModal;
