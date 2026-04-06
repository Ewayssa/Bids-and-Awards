import React from 'react';
import { 
    MdChevronLeft, 
    MdClose, 
    MdFolder, 
    MdDescription, 
    MdError, 
    MdDownload, 
    MdChevronRight,
    MdNavigateBefore,
    MdNavigateNext
} from 'react-icons/md';
import { DocDetailsView } from '../DocDetailsView';
import Modal from '../../Modal';

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
                            const count = docsInCategory.filter((d) => (d.prNo || '').trim() === prNo).length;
                            return (
                                <button
                                    key={prNo}
                                    type="button"
                                    onClick={() => {
                                        setManageFolderPopup({ typeId: manageSelectedTypeId, prNo });
                                        setManageFolderPopupIndex(0);
                                    }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:text-emerald-600 transition-colors">
                                            <MdFolder className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">BAC No. {prNo}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} document{count !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <MdChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
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
                size="xl"
                showCloseButton={true}
            >
                <div className="flex flex-col lg:flex-row gap-6 max-h-[80vh]">
                    {/* Left Panel: List & Details */}
                    <div className="lg:w-[350px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Navigation</p>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Doc {currentIndex + 1} of {totalDocs}</p>
                                <div className="flex gap-2">
                                    <button 
                                        disabled={currentIndex === 0}
                                        onClick={() => setManageFolderPopupIndex(v => v - 1)}
                                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-600 disabled:opacity-40"
                                    >
                                        <MdNavigateBefore className="w-5 h-5" />
                                    </button>
                                    <button 
                                        disabled={currentIndex === totalDocs - 1}
                                        onClick={() => setManageFolderPopupIndex(v => v + 1)}
                                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-slate-600 disabled:opacity-40"
                                    >
                                        <MdNavigateNext className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <DocDetailsView doc={currentDoc} />
                        </div>

                        {isAdmin && currentDoc?.file_url && (
                            <button
                                type="button"
                                onClick={() => triggerDownload(currentDoc)}
                                className="w-full py-4 bg-blue-600/90 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5"
                            >
                                Download PDF
                            </button>
                        )}
                    </div>

                    {/* Right Panel: Preview Area */}
                    <div className="flex-1 flex flex-col gap-4 min-h-[500px]">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-blue-500">
                                    <MdDescription className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Digital Copy</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={currentDoc?.title || currentDoc?.subDoc}>
                                        {currentDoc?.title || currentDoc?.subDoc}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-200 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner">
                            {manageFolderPopupPreview?.previewBlobUrl === 'no-file' ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center bg-white dark:bg-slate-900">
                                    <MdError className="w-16 h-16 opacity-20 mb-4" />
                                    <p className="font-bold text-slate-600 dark:text-slate-400">No Digital File Record</p>
                                    <p className="text-xs uppercase tracking-widest mt-1 opacity-60">Attachment unavailable</p>
                                </div>
                            ) : manageFolderPopupPreview?.previewBlobUrl === 'failed' ? (
                                <div className="flex flex-col items-center justify-center h-full text-red-400 p-8 text-center bg-red-50/30">
                                    <MdError className="w-16 h-16 opacity-40 mb-4" />
                                    <p className="font-bold">Preview Request Failed</p>
                                    <p className="text-xs uppercase tracking-widest mt-1 opacity-60">Unable to stream file</p>
                                </div>
                            ) : manageFolderPopupPreview?.previewBlobUrl ? (
                                (() => {
                                    const ct = manageFolderPopupPreview.previewBlobType || '';
                                    const isPdf = ct.includes('pdf');
                                    const isImage = /^image\//.test(ct);
                                    if (isPdf) {
                                        return (
                                            <embed
                                                src={`${manageFolderPopupPreview.previewBlobUrl}#toolbar=0&navpanes=0`}
                                                type="application/pdf"
                                                className="w-full h-full"
                                            />
                                        );
                                    }
                                    if (isImage) {
                                        return (
                                            <div className="w-full h-full flex items-center justify-center p-6">
                                                <img src={manageFolderPopupPreview.previewBlobUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                                            </div>
                                        );
                                    }
                                    return (
                                        <iframe src={manageFolderPopupPreview.previewBlobUrl} title="Doc" className="w-full h-full border-0" />
                                    );
                                })()
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-900">
                                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-emerald-500 animate-spin mb-4" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Streaming Metadata</p>
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
                title="Archive Explorer"
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
