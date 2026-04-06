import React from 'react';
import { MdFilePresent, MdErrorOutline } from 'react-icons/md';
import Modal from '../../Modal';

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
            <div className="flex flex-col items-center justify-center py-32 text-[var(--text-muted)] bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 animate-spin mb-4" />
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
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-600 dark:text-blue-400">
                        <MdFilePresent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Previewing Attachment</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.title}</p>
                    </div>
                </div>

                {renderPreviewContent()}

            </div>
        </Modal>
    );
};

export default PreviewModal;
