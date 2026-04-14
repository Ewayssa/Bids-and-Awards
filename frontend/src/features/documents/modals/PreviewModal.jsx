import React from 'react';
import { MdFilePresent, MdErrorOutline } from 'react-icons/md';
import Modal from '../../../components/Modal';

const PreviewModal = ({ doc, onClose }) => {
    if (!doc) return null;

    const renderPreviewContent = () => {
        if (doc.previewBlobUrl === 'failed') {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20">
                    <MdErrorOutline className="w-12 h-12 mb-3" />
                    <p className="font-bold">Could not load file.</p>
                    <p className="text-sm opacity-75">The file might be missing or corrupted.</p>
                </div>
            );
        }

        if (doc.previewBlobUrl) {
            const ct = doc.previewBlobType || '';
            const isPdf = ct.includes('pdf');
            const isImage = /^image\//.test(ct);

            if (isPdf) {
                return (
                    <div className="bg-slate-200 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner">
                        <embed
                            src={`${doc.previewBlobUrl}#toolbar=0&navpanes=0`}
                            type="application/pdf"
                            className="w-full h-[70vh] min-h-[600px]"
                            title="Document Preview"
                        />
                    </div>
                );
            }

            if (isImage) {
                return (
                    <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[400px]">
                        <img
                            src={doc.previewBlobUrl}
                            alt={doc.title}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
                        />
                    </div>
                );
            }

            return (
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner h-[70vh]">
                    <iframe
                        src={doc.previewBlobUrl}
                        title={doc.title}
                        className="w-full h-full border-0"
                        sandbox="allow-same-origin"
                    />
                </div>
            );
        }

        return (
                <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)] bg-[var(--background-subtle)]/50 rounded-xl border border-[var(--border-light)]">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-4" aria-hidden />
                <p className="font-bold">Loading Preview</p>
                <p className="text-sm opacity-60">Preparing your document for viewing...</p>
            </div>
        );
    };

    return (
        <Modal
            isOpen={!!doc}
            onClose={onClose}
            title={doc.title || "File Preview"}
            size="xl"
            showCloseButton={true}
        >
            <div className="space-y-6">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)]/60">
                    <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border-light)] text-[var(--primary)] shadow-sm">
                        <MdFilePresent className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-muted)] m-0">Preview</p>
                        <p className="text-sm font-semibold text-[var(--text)] truncate m-0 mt-0.5">{doc.title}</p>
                    </div>
                </div>

                {renderPreviewContent()}

            </div>
        </Modal>
    );
};

export default PreviewModal;
