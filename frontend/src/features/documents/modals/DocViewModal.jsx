import React from 'react';
import { MdClose, MdCloudUpload, MdPictureAsPdf, MdAssignment } from 'react-icons/md';
import Modal from '../../../components/Modal';

const DocViewModal = ({ 
    doc, 
    onClose, 
    onUploadMissing 
}) => {
    if (!doc) return null;

    const items = (() => {
        try {
            return typeof doc.pr_items === 'string' ? JSON.parse(doc.pr_items || '[]') : (doc.pr_items || []);
        } catch (e) {
            return [];
        }
    })();

    // Robust URL Resolver: Ensures relative paths from DB are mapped through the /media/ proxy
    const getPreviewUrl = (target) => {
        if (!target) return null;
        let url = target.file_url || target.file;
        if (!url || typeof url !== 'string' || url.includes('/api/')) return null;

        if (url.includes('/media/')) {
            url = `/media/${url.split('/media/')[1]}`;
        } else if (!url.startsWith('http') && !url.startsWith('/')) {
            url = `/media/${url}`;
        } else if (url.startsWith('http')) {
            try {
                const parsed = new URL(url);
                if (parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
                    url = parsed.pathname + parsed.search;
                }
            } catch(e) {}
        }
        
        return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    };

    const previewUrl = getPreviewUrl(doc);

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={null}
            size="full"
            showCloseButton={false}
        >
            <div className="flex flex-col h-[90vh] bg-slate-50 dark:bg-slate-950 overflow-hidden">
                {/* Simplified Sticky Header */}
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-20">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <MdAssignment className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                    Purchase Request <span className="text-slate-300 dark:text-slate-600 mx-1">/</span> <span className="text-emerald-600">{doc.prNo}</span>
                                </h2>
                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    {doc.status}
                                </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">
                                Purpose: {doc.title || 'General Procurement'}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all active:scale-95 border border-slate-100 dark:border-slate-700"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Bill of Quantities Table (72%) */}
                    <div className="w-[72%] flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="h-16 flex items-center px-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/5 rounded-lg text-emerald-600">
                                    <MdAssignment className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em]">Bill of Quantities</h3>
                            </div>
                            <div className="px-4 py-2 bg-slate-900 dark:bg-slate-800 rounded-xl shadow-lg border border-slate-800 dark:border-slate-700">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2">Grand Total</span>
                                <span className="text-xs font-black text-white tracking-widest">₱{Number(doc.total_amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Unit</th>
                                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Description</th>
                                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Qty</th>
                                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Cost</th>
                                        <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {items.length > 0 ? items.map((item, idx) => (
                                        <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{item.unit || '—'}</td>
                                            <td className="py-4">
                                                <div className="text-[11px] font-black text-slate-800 dark:text-slate-200 leading-relaxed group-hover:text-emerald-600 transition-colors">{item.description}</div>
                                            </td>
                                            <td className="py-4 text-center text-[11px] font-black text-slate-900 dark:text-slate-100">{item.quantity}</td>
                                            <td className="py-4 text-center text-[10px] font-bold text-slate-500 italic">₱{Number(item.unit_cost || 0).toLocaleString()}</td>
                                            <td className="py-4 text-right text-[11px] font-black text-emerald-600 tracking-tight">₱{Number((item.quantity || 0) * (item.unit_cost || 0)).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No line items available in manual entry.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: PDF Preview (28%) */}
                    <div className="w-[28%] bg-slate-100 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl relative z-10">
                        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <MdPictureAsPdf className="w-4 h-4 text-red-500" />
                                <h3 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em]">Official Scanned PR</h3>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950 overflow-hidden">
                            {previewUrl ? (
                                <iframe 
                                    src={previewUrl} 
                                    className="w-full h-full border-0 animate-in fade-in zoom-in-95 duration-500"
                                    title="Live Audit Preview"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                                    <div className="w-20 h-20 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center">
                                        <MdCloudUpload className="w-10 h-10 text-amber-500/40" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest tracking-tighter">Document Not Uploaded</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-[180px] mx-auto">Upload the signed scan to complete the digital audit.</p>
                                    </div>
                                    <button 
                                        onClick={() => onUploadMissing('Purchase Request', null)}
                                        className="px-8 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                                    >
                                        Upload Now
                                    </button>
                                </div>
                            )}
                            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.02)]" />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default DocViewModal;
