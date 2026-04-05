import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    MdChevronLeft, 
    MdClose, 
    MdFolder, 
    MdDescription, 
    MdError, 
    MdDownload, 
    MdChevronRight 
} from 'react-icons/md';
import { DocDetailsView } from '../DocDetailsView';

const ManageDocumentsModal = ({
    isOpen,
    onClose,
    manageSelectedTypeId,
    setManageSelectedTypeId,
    manageSelectedPrNo,
    setManageSelectedPrNo,
    manageFolderPopup,
    setManageFolderPopup,
    manageFolderPopupPreview,
    manageFolderPopupIndex,
    setManageFolderPopupIndex,
    manageRefreshing,
    documents,
    DOC_TYPES,
    isAdmin,
    triggerDownload
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

    const mainModalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="card-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-2xl border-0 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between shrink-0 bg-[var(--surface)] rounded-t-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        {manageSelectedTypeId && (
                            <button
                                type="button"
                                onClick={() => setManageSelectedTypeId(null)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] px-3 py-1.5 rounded-lg border border-transparent hover:border-[var(--primary-muted)] hover:bg-[var(--primary-muted)]/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1"
                                aria-label="Back to document types"
                            >
                                <MdChevronLeft className="w-4 h-4" aria-hidden="true" />
                                Back
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-[var(--text)] truncate">
                            {!manageSelectedTypeId ? 'Manage Documents' : (DOC_TYPES.find((d) => d.id === manageSelectedTypeId)?.name || 'Documents')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] rounded-lg transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                    {!manageSelectedTypeId ? (
                        /* Level 1: Document type folders */
                        <>
                            {manageRefreshing && (
                                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--text-muted)]">
                                    <div className="w-4 h-4 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin" />
                                    <span>Loading all documents…</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {DOC_TYPES.map((docType) => {
                                    const categoryName = (docType.name || '').trim();
                                    const docsInType = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
                                    const folderCount = new Set(docsInType.map((d) => (d.prNo || '').trim()).filter(Boolean)).size;
                                    return (
                                        <button
                                            key={docType.id}
                                            type="button"
                                            onClick={() => setManageSelectedTypeId(docType.id)}
                                            className="flex flex-col items-stretch rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-muted)]/20 p-4 text-left transition-all shadow-sm"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)] mb-3">
                                                <MdFolder className="w-7 h-7" />
                                            </div>
                                            <p className="font-semibold text-[var(--text)] truncate">{docType.name}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{folderCount} BAC folder{folderCount !== 1 ? 's' : ''}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : !manageSelectedPrNo ? (
                        /* Level 2: BAC Folder No. list (sorted) for this document type */
                        (() => {
                            const docType = DOC_TYPES.find((d) => d.id === manageSelectedTypeId);
                            const categoryName = (docType?.name || '').trim();
                            const docsInCategory = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
                            const prNoList = [...new Set(docsInCategory.map((d) => (d.prNo || '').trim()).filter(Boolean))].sort();
                            if (prNoList.length === 0) {
                                return (
                                    <p className="text-sm text-[var(--text-muted)] text-center py-8">No BAC folders yet for this document type.</p>
                                );
                            }
                            return (
                                <div className="space-y-2">
                                    <ul className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
                                        {prNoList.map((prNo) => {
                                            const count = docsInCategory.filter((d) => (d.prNo || '').trim() === prNo).length;
                                            return (
                                                <li key={prNo}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setManageFolderPopup({ typeId: manageSelectedTypeId, prNo });
                                                            setManageFolderPopupIndex(0);
                                                        }}
                                                        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--primary-muted)]/30 transition-colors"
                                                    >
                                                        <span className="font-medium text-[var(--text)]">BAC Folder No. {prNo}</span>
                                                        <span className="text-sm text-[var(--text-muted)]">{count} document{count !== 1 ? 's' : ''}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                        })()
                    ) : null}
                </div>
            </div>

            {/* Sub-popup Portal */}
            {manageFolderPopup && createPortal((() => {
                const docType = DOC_TYPES.find((d) => d.id === manageFolderPopup.typeId);
                const categoryName = (docType?.name || '').trim();
                const docs = documents.filter(
                    (d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase() && (d.prNo || '').trim() === manageFolderPopup.prNo
                );
                const totalDocs = docs.length;
                const currentIndex = Math.min(manageFolderPopupIndex, Math.max(0, totalDocs - 1));
                const currentDoc = docs[currentIndex] || null;
                const showNav = totalDocs > 1;
                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300 shadow-2xl" aria-modal="true" role="dialog">
                        <div className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-green-600 text-white shadow-sm">
                                        <MdFolder className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[var(--text)]">BAC Folder No. {manageFolderPopup.prNo}</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Document {currentIndex + 1} of {totalDocs}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setManageFolderPopup(null);
                                        }}
                                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                                        aria-label="Close"
                                    >
                                        <MdClose className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                                {totalDocs === 0 ? (
                                    <div className="p-12 text-center text-[var(--text-muted)] w-full flex flex-col items-center justify-center">
                                        <MdDescription className="w-16 h-16 opacity-20 mb-4" />
                                        <p className="text-lg font-medium">No documents in this folder.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Left Side: Procurement Details (Desktop) */}
                                        <div className="hidden lg:block w-[320px] shrink-0 min-h-0 border-r border-[var(--border)]">
                                            <DocDetailsView doc={currentDoc} />
                                        </div>

                                        {/* Right Side: Preview & Meta */}
                                        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50/50">
                                            {/* Details for mobile only */}
                                            <div className="lg:hidden border-b border-[var(--border)] max-h-48 overflow-y-auto shrink-0 bg-white">
                                                <DocDetailsView doc={currentDoc} />
                                            </div>

                                            <div className="flex-1 overflow-auto p-4 min-h-0 flex flex-col">
                                                {!manageFolderPopupPreview ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-green-600 animate-spin mb-4" aria-hidden />
                                                        <span className="font-medium">Loading document metadata…</span>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl === 'no-file' ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <MdError className="w-12 h-12 text-amber-500 mb-4" />
                                                        <p className="text-lg font-bold text-[var(--text)]">No file available</p>
                                                        <p className="text-sm mt-1 max-w-[240px] text-center">This document record exists but no digital file was uploaded.</p>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl === 'failed' ? (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-red-100 bg-red-50/30">
                                                        <MdError className="w-12 h-12 text-red-500 mb-4" />
                                                        <p className="text-lg font-bold text-red-700">Preview Failed</p>
                                                        <p className="text-sm mt-1 text-red-600 text-center">Could not load the document preview.</p>
                                                    </div>
                                                ) : manageFolderPopupPreview.previewBlobUrl ? (
                                                    (() => {
                                                        const ct = manageFolderPopupPreview.previewBlobType || '';
                                                        const isPdf = ct.includes('pdf');
                                                        const isImage = /^image\//.test(ct);
                                                        const previewBoxClass = 'w-full min-h-[480px] flex-1 rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden flex flex-col';
                                                        const docTitle = manageFolderPopupPreview.doc?.title || manageFolderPopupPreview.doc?.subDoc || 'Document';
                                                        const previewActionBar = (
                                                            <div className="w-full flex items-center justify-between gap-4 px-2 mb-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">Preview</span>
                                                                        <p className="text-sm font-bold text-[var(--text)] truncate">{docTitle}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    {isAdmin && currentDoc?.file_url && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => triggerDownload(currentDoc)}
                                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                                                                            aria-label="Download file"
                                                                        >
                                                                            <MdDownload className="w-4 h-4" />
                                                                            Download File
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                        if (isPdf) {
                                                            return (
                                                                <div className="h-full flex flex-col">
                                                                    {previewActionBar}
                                                                    <div className={previewBoxClass}>
                                                                        <embed
                                                                            src={`${manageFolderPopupPreview.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                                            type="application/pdf"
                                                                            className="w-full h-full flex-1 border-0"
                                                                            title={docTitle}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        if (isImage) {
                                                            return (
                                                                <div className="h-full flex flex-col">
                                                                    {previewActionBar}
                                                                    <div className={previewBoxClass}>
                                                                        <div className="flex-1 flex items-center justify-center p-6 bg-gray-200/50">
                                                                            <img
                                                                                src={manageFolderPopupPreview.previewBlobUrl}
                                                                                alt={docTitle}
                                                                                className="max-w-full max-h-[60vh] object-contain shadow-md rounded-lg"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div className="h-full flex flex-col">
                                                                {previewActionBar}
                                                                <div className={previewBoxClass}>
                                                                    <iframe
                                                                        src={manageFolderPopupPreview.previewBlobUrl}
                                                                        title={docTitle}
                                                                        className="w-full h-full flex-1 border-0"
                                                                        sandbox="allow-same-origin"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })()
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center flex-1 min-h-[480px] text-[var(--text-muted)] rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/50">
                                                        <div className="w-12 h-12 rounded-full border-4 border-[var(--border)] border-t-green-600 animate-spin mb-4" aria-hidden />
                                                        <span className="font-medium">Loading digital file…</span>
                                                    </div>
                                                )}
                                            </div>
                                            {showNav && (
                                                <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageFolderPopupIndex((i) => Math.max(0, i - 1))}
                                                        disabled={currentIndex === 0}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)] transition-all active:scale-95"
                                                        aria-label="Previous"
                                                    >
                                                        <MdChevronLeft className="w-5 h-5 font-bold" />
                                                        Prev
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-700 font-bold text-xs">
                                                            {currentIndex + 1}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">of {totalDocs}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageFolderPopupIndex((i) => Math.min(totalDocs - 1, i + 1))}
                                                        disabled={currentIndex >= totalDocs - 1}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--background-subtle)] transition-all active:scale-95"
                                                        aria-label="Next"
                                                    >
                                                        Next
                                                        <MdChevronRight className="w-5 h-5 font-bold" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })(), document.body)}
        </div>
    );

    return createPortal(mainModalContent, document.body);
};

export default ManageDocumentsModal;
