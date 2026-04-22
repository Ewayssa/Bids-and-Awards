import React from 'react';
import { MdFolder, MdDescription, MdDownload, MdWarning, MdTableChart } from 'react-icons/md';
import Modal from '../../../components/Modal';
import { DocDetailsView } from '../DocDetailsView';
import { generatePR_Excel } from '../../../utils/prGenerator';

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
                    {/* Details Side */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <DocDetailsView doc={doc} />
                    </div>

                    {/* Attachment Side */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <MdFolder className="text-emerald-500 w-3.5 h-3.5" />
                                File Attachment
                            </h3>
                            
                            {doc?.file_url ? (
                                <div className="flex flex-col space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                                            <MdDescription className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={doc.title}>
                                                {doc.title || 'Attached Document'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-primary w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 group text-xs"
                                        >
                                            Download / View
                                        </a>

                                        {doc?.subDoc === 'Purchase Request' && (
                                            <button
                                                onClick={() => {
                                                    const prData = {
                                                        items: typeof doc.pr_items === 'string' ? JSON.parse(doc.pr_items) : doc.pr_items || [],
                                                        total: doc.total_amount,
                                                        ppmp_no: doc.ppmp_no,
                                                        prNo: doc.user_pr_no || '',
                                                        title: doc.title,
                                                        office: doc.end_user_office || ''
                                                    };
                                                    generatePR_Excel(prData);
                                                }}
                                                className="w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 border-2 border-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-xs"
                                            >
                                                Download Official PR Layout (Excel)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : doc?.subDoc === 'Purchase Request' ? (
                                <div className="flex flex-col space-y-4">
                                    <div className="flex flex-col items-center justify-center p-8 bg-emerald-50 dark:bg-emerald-500/5 border border-dashed border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-center">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 mb-3">
                                            <MdTableChart className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">PR Layout Ready</p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400/60 mt-1">You can generate the official formal Excel layout for this Purchase Request below.</p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const prData = {
                                                items: typeof doc.pr_items === 'string' ? JSON.parse(doc.pr_items) : doc.pr_items || [],
                                                total: doc.total_amount,
                                                ppmp_no: doc.ppmp_no,
                                                prNo: doc.user_pr_no || '',
                                                title: doc.title,
                                                office: doc.end_user_office || ''
                                            };
                                            generatePR_Excel(prData);
                                        }}
                                        className="w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all text-xs"
                                    >
                                        Generate Official PR (Excel)
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-amber-50 dark:bg-amber-500/5 border border-dashed border-amber-200 dark:border-amber-500/20 rounded-2xl text-center">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 mb-3">
                                        <MdWarning className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide">No file uploaded</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400/60 mt-1">This specific document entry doesn't have an attachment yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Quick Note</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed ml-1 font-medium">
                                Document details are based on the latest submission. For history or changes, check the document trail.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-10 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DocViewModal;
