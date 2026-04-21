import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MdCheckCircle, MdUpload, 
    MdDescription, MdOutlineLibraryBooks,
    MdMoreVert, MdLabel, MdCompareArrows,
    MdOutlineAssignmentTurnedIn, MdClose, MdCloudUpload,
    MdLock, MdDoneAll
} from 'react-icons/md';
import { CHECKLIST_CONFIG, DOC_TYPES } from '../../constants/docTypes';
import { documentService, procurementRecordService } from '../../services/api';
import { formatCurrencyValue } from '../../utils/validation';

const ProcurementWorkflowView = ({ 
    record, 
    user, 
    onRefresh,
    onOpenDoc 
}) => {
    const recordDocs = record?.documents || [];
    const config = CHECKLIST_CONFIG[record?.procurement_type] || CHECKLIST_CONFIG.small_value;
    const isClosed = record?.status === 'closed' || record?.status === 'completed';

    const [activeUploadDoc, setActiveUploadDoc] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Calculate completion status
    const requirements = useMemo(() => {
        const flatReqs = config.groups.flatMap(g => g.documents);
        const results = flatReqs.map(req => {
            const uploadedDocs = recordDocs.filter(d => d.subDoc === req.name);
            const count = uploadedDocs.length;
            const isMet = req.minFiles ? count >= req.minFiles : count > 0;
            return { ...req, count, isMet, docs: uploadedDocs };
        });
        
        const allRequiredMet = results.filter(r => r.required).every(r => r.isMet);
        const hasOfficialPR = !!record?.user_pr_no;
        return { items: results, allRequiredMet, hasOfficialPR };
    }, [recordDocs, config, record?.user_pr_no]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleInlineUpload = async (docName) => {
        if (!selectedFile || isClosed) return;
        
        setUploading(true);
        setError(null);
        try {
            // Determine category Name
            let categoryName = 'Procurement';
            for (const cat of DOC_TYPES) {
               if (cat.subDocs?.includes(docName)) {
                   categoryName = cat.name;
                   break;
               }
            }
            
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', record.title);
            formData.append('prNo', record.pr_no);
            formData.append('year', record.year || '');
            formData.append('quarter', record.quarter || '');
            formData.append('category', categoryName);
            formData.append('subDoc', docName);
            formData.append('status', 'complete');
            formData.append('date', new Date().toISOString().split('T')[0]);
            formData.append('uploadedBy', user?.fullName || user?.username || 'System');

            await documentService.create(formData, record.id);
            
            setActiveUploadDoc(null);
            setSelectedFile(null);
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Upload failed:', err);
            const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to upload document. Please check the file and try again.';
            setError(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleComplete = async () => {
        if (!requirements.allRequiredMet || !requirements.hasOfficialPR || isClosed || completing) return;
        
        if (!window.confirm('Are you sure you want to mark this procurement as COMPLETED? This will lock the record and include it in final reports.')) {
            return;
        }

        setCompleting(true);
        setError(null);
        try {
            await procurementRecordService.update(record.id, { status: 'closed' });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Completion failed:', err);
            const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to mark as completed. Check if all requirements are actually met.';
            setError(msg);
        } finally {
            setCompleting(false);
        }
    };

    const handleViewDoc = (doc) => {
        if (doc.file_url) {
            window.open(doc.file_url, '_blank', 'noopener');
        } else if (onOpenDoc) {
            onOpenDoc(doc);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-slate-950">
            {/* High-End Header */}
            <div className="px-8 pt-8 pb-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    {isClosed ? (
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center gap-2 animate-in fade-in zoom-in">
                            <MdLock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">RECORD LOCKED & COMPLETED</span>
                        </div>
                    ) : (
                        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center gap-2">
                            <MdLabel className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{record?.status || 'Active'}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-5 mb-2 relative z-10">
                    <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-lg ${
                        isClosed ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-slate-900 text-white shadow-slate-900/20'
                    }`}>
                        {isClosed ? <MdDoneAll className="w-8 h-8" /> : <MdOutlineAssignmentTurnedIn className="w-8 h-8" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Requirements Checklist</h3>
                            {!isClosed && requirements.allRequiredMet && (
                                <motion.span 
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase rounded-md border border-emerald-200"
                                >
                                    Ready to Complete
                                </motion.span>
                            )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                <span>Folder: {record?.pr_no}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>{config.name}</span>
                            </p>
                            {requirements.hasOfficialPR ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                    <MdLabel className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-tight">PR: {record.user_pr_no}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 animate-pulse">
                                    <MdInfo className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-tight">Pending FAD PR Assignment</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-600 shadow-sm grow-0 shrink-0">
                            <MdClose className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-red-800 leading-tight flex-1">{error}</p>
                        <button onClick={() => setError(null)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                            <MdClose className="w-4 h-4 text-red-400" />
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Checklist Body with Grouping */}
            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-10">
                    {config.groups.map((group, gIdx) => (
                        <section key={gIdx} className="space-y-4">
                            <div className="flex items-center gap-4 px-2">
                                <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800" />
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap">
                                    {group.name}
                                </h5>
                                <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800" />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {group.documents.map((req, dIdx) => {
                                    const statusObj = requirements.items.find(i => i.name === req.name);
                                    const uploaded = statusObj?.isMet;
                                    const isBeingUploaded = activeUploadDoc === req.name;
                                    const showCounter = !!req.minFiles;
                                    
                                    return (
                                        <motion.div 
                                            key={dIdx}
                                            layout
                                            className={`flex flex-col rounded-[1.5rem] border-2 transition-all duration-300 overflow-hidden ${
                                                uploaded 
                                                    ? 'bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-950/10 dark:border-emerald-900/30' 
                                                    : isBeingUploaded
                                                        ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/10 shadow-xl'
                                                        : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 p-5">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                                    uploaded 
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-[360deg]' 
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                }`}>
                                                    {uploaded ? <MdCheckCircle className="w-6 h-6" /> : <MdDescription className="w-5 h-5" />}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-[13px] font-bold truncate transition-colors ${
                                                            uploaded ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'
                                                        }`}>
                                                            {req.name}
                                                        </h4>
                                                        {req.required && !uploaded && (
                                                            <span className="text-[9px] font-black text-red-500/60 uppercase tracking-tighter">Required</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className={`text-[9px] font-black uppercase tracking-tight transition-colors ${
                                                            uploaded ? 'text-emerald-600' : 'text-slate-400'
                                                        }`}>
                                                            {uploaded ? 'Submitted' : isBeingUploaded ? 'Ready to Sync' : 'Missing'}
                                                        </p>
                                                        {showCounter && (
                                                            <>
                                                                <span className="text-[9px] text-slate-300">|</span>
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                                                    uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {statusObj.count}/{req.minFiles} Uploaded
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {statusObj?.count > 0 && (
                                                        <button 
                                                            onClick={() => handleViewDoc(statusObj.docs[statusObj.docs.length - 1])}
                                                            className="px-4 py-2 bg-white dark:bg-slate-800 text-[10px] font-black uppercase text-slate-600 rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all active:scale-95"
                                                        >
                                                            {statusObj.count > 1 ? `View (${statusObj.count})` : 'View'}
                                                        </button>
                                                    )}
                                                    
                                                    {!isClosed && !uploaded && (
                                                        isBeingUploaded ? (
                                                            <button 
                                                                onClick={() => { setActiveUploadDoc(null); setSelectedFile(null); }}
                                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <MdClose className="w-6 h-6" />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setActiveUploadDoc(req.name)}
                                                                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
                                                            >
                                                                <MdUpload className="w-3.5 h-3.5" />
                                                                {showCounter && statusObj.count > 0 ? 'Add More' : 'Upload'}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {isBeingUploaded && !isClosed && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800/50"
                                                    >
                                                        <div className="pt-5 flex flex-col sm:flex-row items-center gap-4">
                                                            <div 
                                                                onClick={() => fileInputRef.current?.click()}
                                                                className="flex-1 w-full h-12 border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center px-4 gap-3 bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-400 transition-all group"
                                                            >
                                                                <MdCloudUpload className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                                                <span className="text-xs font-bold text-slate-500 truncate">
                                                                    {selectedFile ? selectedFile.name : 'Select or drag document here...'}
                                                                </span>
                                                                <input 
                                                                    type="file" 
                                                                    ref={fileInputRef}
                                                                    onChange={handleFileChange}
                                                                    className="hidden" 
                                                                />
                                                            </div>
                                                            <button
                                                                disabled={!selectedFile || uploading}
                                                                onClick={() => handleInlineUpload(req.name)}
                                                                className={`h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                                    !selectedFile || uploading
                                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95'
                                                                }`}
                                                            >
                                                                {uploading ? 'Syncing...' : 'Submit File'}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            {/* Footer with Completion Logic */}
            {!isClosed && (
                <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                             <MdDoneAll className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Progress</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {requirements.items.filter(i => i.isMet).length} of {requirements.items.length} items collected
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleComplete}
                        disabled={!requirements.allRequiredMet || !requirements.hasOfficialPR || completing}
                        className={`px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-3 ${
                            requirements.allRequiredMet && requirements.hasOfficialPR 
                                ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale'
                        }`}
                    >
                        {completing ? 'Processing...' : 'Mark as Completed'}
                        {!completing && requirements.allRequiredMet && requirements.hasOfficialPR && <MdCheckCircle className="w-5 h-5" />}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProcurementWorkflowView;
