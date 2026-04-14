import React from 'react';
import {
    MdChevronLeft,
    MdFolder,
    MdDescription,
    MdError,
    MdChevronRight,
    MdNavigateBefore,
    MdNavigateNext,
    MdOpenInNew,
} from 'react-icons/md';
import { DocDetailsView } from '../DocDetailsView';
import Modal from '../../../components/Modal';

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
    DOC_TYPES
}) => {
    const renderExplorer = () => {
        if (!manageSelectedTypeId) {
            return (
                <div className="space-y-6">
                    {manageRefreshing && (
                        <div className="alert-info py-3.5">
                            <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin shrink-0" aria-hidden />
                            <span className="text-sm font-medium">Scanning document repository…</span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DOC_TYPES.map((docType) => {
                            const categoryName = (docType.name || '').trim();
                            const docsInType = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
                            const folderCount = new Set(docsInType.map((d) => (d.prNo || '').trim()).filter(Boolean)).size;
                            return (
                                <button
                                    key={docType.id}
                                    type="button"
                                    onClick={() => setManageSelectedTypeId(docType.id)}
                                    className="group relative flex flex-col p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-light)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:shadow-[var(--shadow-md)] transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)] mb-3">
                                        <MdFolder className="w-6 h-6" aria-hidden />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors truncate m-0">{docType.name}</p>
                                    <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mt-1 m-0">
                                        {folderCount} folder{folderCount !== 1 ? 's' : ''}
                                    </p>
                                    <div className="absolute top-3 right-3 text-[var(--text-subtle)] group-hover:text-[var(--primary)] transition-colors">
                                        <MdChevronRight className="w-5 h-5" aria-hidden />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        const docType = DOC_TYPES.find((d) => d.id === manageSelectedTypeId);
        const categoryName = (docType?.name || '').trim();
        const docsInCategory = documents.filter((d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase());
        const prNoList = [...new Set(docsInCategory.map((d) => (d.prNo || '').trim()).filter(Boolean))].sort();

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--background-subtle)]/50">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setManageSelectedTypeId(null)}
                            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] transition-colors"
                            aria-label="Back to categories"
                        >
                            <MdChevronLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide m-0">Category</p>
                            <p className="text-xs font-semibold text-[var(--text)] m-0 mt-0.5">{docType?.name}</p>
                        </div>
                    </div>
                </div>

                {prNoList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background-subtle)]/30">
                        <MdDescription className="w-12 h-12 text-[var(--text-subtle)] mb-3" aria-hidden />
                        <p className="text-sm font-medium text-[var(--text-muted)] m-0">No folders found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                        {prNoList.map((prNo) => {
                            const docsInFolder = docsInCategory.filter((d) => (d.prNo || '').trim() === prNo);
                            const count = docsInFolder.length;
                            const statusCounts = docsInFolder.reduce((acc, d) => {
                                const s = d.status || 'pending';
                                acc[s] = (acc[s] || 0) + 1;
                                return acc;
                            }, {});

                            return (
                                <button
                                    key={prNo}
                                    type="button"
                                    onClick={() => {
                                        setManageFolderPopup({ typeId: manageSelectedTypeId, prNo });
                                        setManageFolderPopupIndex(0);
                                    }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-light)] hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[var(--primary-muted)]/25 transition-colors group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-[var(--background-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--primary-muted)] group-hover:text-[var(--primary)] transition-colors">
                                            <MdFolder className="w-5 h-5" aria-hidden />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex gap-1 mb-1">
                                                {statusCounts.complete > 0 && <div className="w-1.5 h-1.5 rounded-full bg-primary-600" title={`${statusCounts.complete} complete`} />}
                                                {statusCounts.ongoing > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${statusCounts.ongoing} ongoing`} />}
                                                {statusCounts.pending > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" title={`${statusCounts.pending} pending`} />}
                                            </div>
                                            <p className="text-[13px] font-semibold text-[var(--text)] m-0">BAC No. {prNo}</p>
                                            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide m-0 mt-0.5">{count} document{count !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-4 h-4 text-[var(--text-subtle)] group-hover:text-[var(--primary)] transition-colors shrink-0" aria-hidden />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderDetailPopup = () => {
        if (!manageFolderPopup) return null;

        const docType = DOC_TYPES.find((d) => d.id === manageFolderPopup.typeId);
        const categoryName = (docType?.name || '').trim();
        const docs = documents.filter(
            (d) => (d.category || '').trim().toLowerCase() === categoryName.toLowerCase() && (d.prNo || '').trim() === manageFolderPopup.prNo
        );
        const totalDocs = docs.length;
        const currentIndex = Math.min(manageFolderPopupIndex, Math.max(0, totalDocs - 1));
        const currentDoc = docs[currentIndex] || null;

        return (
            <Modal
                isOpen={true}
                onClose={() => setManageFolderPopup(null)}
                title={`BAC No. ${manageFolderPopup.prNo}`}
                size="lg"
                showCloseButton={true}
            >
                <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Navigation */}
                    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--primary-muted)]/50">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-semibold text-[var(--text-muted)] m-0">Navigation</p>
                                <p className="text-xs font-semibold text-[var(--text)] m-0 mt-0.5">Document {currentIndex + 1} of {totalDocs}</p>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    disabled={currentIndex === 0}
                                    onClick={() => setManageFolderPopupIndex((v) => v - 1)}
                                    className="pagination-btn p-2"
                                    aria-label="Previous document"
                                >
                                    <MdNavigateBefore className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={currentIndex === totalDocs - 1}
                                    onClick={() => setManageFolderPopupIndex((v) => v + 1)}
                                    className="pagination-btn p-2"
                                    aria-label="Next document"
                                >
                                    <MdNavigateNext className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)] flex flex-col shrink-0">
                        <DocDetailsView doc={currentDoc} />

                        <div className="p-4 border-t border-[var(--border-light)] bg-[var(--background-subtle)]/40">
                            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3 m-0">Digital copy</p>
                            {currentDoc?.file_url ? (
                                <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border-light)] shadow-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--primary-muted)] flex items-center justify-center text-[var(--primary)]">
                                            <MdDescription className="w-5 h-5" aria-hidden />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--text)] truncate m-0" title={currentDoc.file_url.split('/').pop()}>
                                                {currentDoc.file_url.split('/').pop() || 'document_file.pdf'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => window.open(currentDoc.file_url, '_blank')}
                                        className="btn-compact-primary shrink-0"
                                    >
                                        <span>View</span>
                                        <MdOpenInNew className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-xl border border-[var(--border-light)] text-[var(--text-muted)]">
                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-[var(--background-subtle)] flex items-center justify-center">
                                        <MdError className="w-5 h-5 opacity-60" aria-hidden />
                                    </div>
                                    <p className="text-xs font-medium m-0">No digital file attached</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        );
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Manage Documents"
                size="auto"
                showCloseButton={true}
            >
                {renderExplorer()}
            </Modal>
            {renderDetailPopup()}
        </>
    );
};

export default ManageDocumentsModal;
