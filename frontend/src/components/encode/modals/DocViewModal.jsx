import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdFolder, MdDescription, MdDownload, MdWarning } from 'react-icons/md';
import { DocDetailsView } from '../DocDetailsView';

const DocViewModal = ({ doc, onClose }) => {
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
            <div className="card-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl rounded-2xl border-0 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--surface)]">
                    <h2 className="text-lg font-semibold text-[var(--text)]">View Document Details</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        <div className="flex flex-col bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <DocDetailsView doc={doc} />
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2 uppercase tracking-widest">
                                    <MdFolder className="text-[var(--primary)]" />
                                    Attached Document
                                </h3>
                                {doc.file_url ? (
                                    <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100/50 rounded-lg">
                                                <MdDescription className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-blue-900 break-all">{doc.title || 'Document File'}</p>
                                                <p className="text-[10px] uppercase font-bold text-blue-700 opacity-75">Available for view/download</p>
                                            </div>
                                        </div>
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary py-2 px-4 text-[10px] uppercase font-bold flex items-center gap-2 shadow-sm hover:translate-y-[-1px] transition-transform"
                                        >
                                            <MdDownload className="w-4 h-4" />
                                            View
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800">
                                        <MdWarning className="w-5 h-5 text-amber-600" />
                                        <p className="text-xs font-bold uppercase tracking-wide">No file uploaded for this document yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--border-light)] bg-white flex justify-end">
                    <button type="button" onClick={onClose} className="btn-secondary px-8 font-bold text-sm uppercase tracking-wide">Close</button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default DocViewModal;
