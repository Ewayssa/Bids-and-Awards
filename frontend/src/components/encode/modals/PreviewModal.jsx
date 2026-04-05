import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';

const PreviewModal = ({ doc, onClose }) => {
    useEffect(() => {
        if (doc) {
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            const originalBodyStyle = window.getComputedStyle(document.body).overflow;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            return () => {
                document.documentElement.style.overflow = originalHtmlStyle;
                document.body.style.overflow = originalBodyStyle;
            };
        }
    }, [doc]);

    if (!doc) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                    <h2 className="text-lg font-semibold text-[var(--text)]">{doc.title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    {doc.previewBlobUrl === 'failed' ? (
                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                            <p>Could not load file.</p>
                        </div>
                    ) : doc.previewBlobUrl ? (
                        (() => {
                            const ct = doc.previewBlobType || '';
                            const isPdf = ct.includes('pdf');
                            const isImage = /^image\//.test(ct);
                            if (isPdf) {
                                return (
                                    <embed
                                        src={`${doc.previewBlobUrl}#toolbar=0&navpanes=0`}
                                        type="application/pdf"
                                        className="w-full min-h-[600px] flex-1 border-0 rounded-lg"
                                        title="Document"
                                    />
                                );
                            }
                            if (isImage) {
                                return (
                                    <img
                                        src={doc.previewBlobUrl}
                                        alt={doc.title}
                                        className="max-w-full max-h-[70vh] object-contain mx-auto"
                                    />
                                );
                            }
                            return (
                                <iframe
                                    src={doc.previewBlobUrl}
                                    title={doc.title}
                                    className="w-full min-h-[600px] flex-1 border-0 rounded-lg bg-white"
                                    sandbox="allow-same-origin"
                                />
                            );
                        })()
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                            <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin mb-3" aria-hidden />
                            <span>Loading file…</span>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-[var(--border-light)] bg-[var(--surface)] flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-primary"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PreviewModal;
