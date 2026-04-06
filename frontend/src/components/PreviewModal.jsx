import React from 'react';
import { MdClose, MdInfo, MdFileOpen } from 'react-icons/md';
import Modal from './Modal';

const PreviewModal = ({ onClose, previewReport }) => {
    if (!previewReport) return null;

    const { title, previewBlobUrl, previewBlobType } = previewReport;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Archive Retrieval Preview"
            size="xl"
            showCloseButton={true}
        >
            <div className="space-y-6">
                {/* Header Banner */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-5">
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-blue-600 shrink-0">
                        <MdFileOpen className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Document Stream</p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-md">
                            {title}
                        </h3>
                    </div>
                </div>

                <div className="relative rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 min-h-[600px] flex flex-col">
                    {previewBlobUrl === 'failed' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-2xl text-red-500 mb-4">
                                <MdInfo className="w-10 h-10" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Retrieval Failure</p>
                            <p className="text-xs font-bold text-slate-500 uppercase mt-2">The requested archive could not be rendered.</p>
                        </div>
                    ) : previewBlobUrl ? (
                        <div className="flex-1 flex flex-col">
                            {(() => {
                                const ct = previewBlobType || '';
                                if (ct.includes('pdf')) {
                                    return (
                                        <embed
                                            src={`${previewBlobUrl}#toolbar=0&navpanes=0`}
                                            type="application/pdf"
                                            className="w-full h-[600px] border-0"
                                            title={title}
                                        />
                                    );
                                }
                                if (/^image\//.test(ct)) {
                                    return (
                                        <div className="flex-1 p-8 flex items-center justify-center">
                                            <img
                                                src={previewBlobUrl}
                                                alt={title}
                                                className="max-w-full max-h-[550px] object-contain rounded-xl shadow-2xl"
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <iframe
                                        src={previewBlobUrl}
                                        title={title}
                                        className="w-full h-[600px] border-0"
                                        sandbox="allow-same-origin"
                                    />
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12">
                            <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
                                Retrieving Stream...
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </Modal>
    );
};

export default PreviewModal;
