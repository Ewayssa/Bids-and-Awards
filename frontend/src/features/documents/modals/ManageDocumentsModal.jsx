import React from 'react';
import { 
    MdChevronLeft, 
    MdClose, 
    MdFolder, 
    MdDescription, 
    MdError, 
    MdChevronRight,
    MdNavigateBefore,
    MdNavigateNext,
    MdOpenInNew
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
                        <div className="flex items-center justify-center gap-3 py-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                            <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-blue-600 animate-spin" />
                            <span className="text-sm font-bold uppercase tracking-widest">Scanning Document Repository...</span>
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
                                    className="group relative flex flex-col p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                                        <MdFolder className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors truncate">{docType.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                                        {folderCount} Folders
                                    </p>
                                    <div className="absolute top-3 right-3 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all">
                                        <MdChevronRight className="w-5 h-5" />
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
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setManageSelectedTypeId(null)}
                            className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:text-emerald-600 transition-colors"
                        >
                            <MdChevronLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{docType?.name}</p>
                        </div>
                    </div>
                </div>

                {prNoList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <MdDescription className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No folders found</p>
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
                                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-all group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:text-emerald-600 transition-colors">
                                            <MdFolder className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex gap-1 mb-1">
                                                {statusCounts.complete > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" title={`${statusCounts.complete} complete`} />}
                                                {statusCounts.ongoing > 0 && <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]" title={`${statusCounts.ongoing} ongoing`} />}
                                                {statusCounts.pending > 0 && <div className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.4)]" title={`${statusCounts.pending} pending`} />}
                                            </div>
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tight">BAC No. {prNo}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} document{count !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
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
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Navigation</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Doc {currentIndex + 1} of {totalDocs}</p>
                            </div>
                            <div className="flex gap-1.5">
                                <button 
                                    disabled={currentIndex === 0}
                                    onClick={() => setManageFolderPopupIndex(v => v - 1)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-600 disabled:opacity-30 hover:bg-emerald-50 transition-colors"
                                >
                                    <MdNavigateBefore className="w-5 h-5" />
                                </button>
                                <button 
                                    disabled={currentIndex === totalDocs - 1}
                                    onClick={() => setManageFolderPopupIndex(v => v + 1)}
                                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-600 disabled:opacity-30 hover:bg-emerald-50 transition-colors"
                                >
                                    <MdNavigateNext className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Single Container for Details & File */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col shrink-0">
                        <DocDetailsView doc={currentDoc} />

                        {/* Uploaded File Section at the bottom */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Digital Copy</p>
                            {currentDoc?.file_url ? (
                                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-3 min-w-0 pr-4">
                                        <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <MdDescription className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={currentDoc.file_url.split('/').pop()}>
                                                {currentDoc.file_url.split('/').pop() || 'document_file.pdf'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => window.open(currentDoc.file_url, '_blank')}
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors active:scale-95"
                                    >
                                        <span>View</span>
                                        <MdOpenInNew className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400">
                                    <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                        <MdError className="w-5 h-5 opacity-50" />
                                    </div>
                                    <p className="text-[11px] font-medium tracking-wide">No digital file attached</p>
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
