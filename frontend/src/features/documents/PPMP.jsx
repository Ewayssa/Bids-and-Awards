import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdAssignment, MdUpload, MdVisibility, MdDelete } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import UploadPPMPModal from './modals/UploadPPMPModal';
import PreviewModal from './modals/PreviewModal';
import { documentService } from '../../services/api';

const PPMP = ({ user }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [ppmps, setPpmps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    const fetchPPMPs = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll({ 
                subDoc: 'Project Procurement Management Plan/Supplemental PPMP'
            });
            setPpmps(data);
        } catch (err) {
            console.error('Failed to fetch PPMPs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this PPMP?')) return;
        
        try {
            await documentService.delete(id);
            fetchPPMPs();
        } catch (err) {
            console.error('Failed to delete PPMP:', err);
            alert('Failed to delete PPMP. Please try again.');
        }
    };

    useEffect(() => {
        fetchPPMPs();
    }, []);

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Project Procurement Management Plan (PPMP)"
                subtitle="Manage and track PPMP records."
            >
                {user?.role !== ROLES.VIEWER && (
                    <button 
                        type="button" 
                        onClick={() => setShowUploadModal(true)} 
                        className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <MdUpload className="w-5 h-5" />
                        <span>Upload PPMP</span>
                    </button>
                )}
            </PageHeader>

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">


                {ppmps.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-[#F8FAFC] dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap" style={{ width: '35%' }}>PPMP No.</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap" style={{ width: '15%' }}>Year</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap" style={{ width: '15%' }}>Quarter</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap" style={{ width: '20%' }}>Date Uploaded</th>
                                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right whitespace-nowrap" style={{ width: '15%' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {ppmps.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                        <td className="px-8 py-5 align-middle">
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-black text-sm text-slate-800 dark:text-slate-200 group-hover:text-[var(--primary)] transition-colors truncate">
                                                    {item.ppmp_no}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">Initial Procurement Requirement</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700">
                                                {item.year || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest px-3 py-1.5 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20 shadow-sm">
                                                {item.quarter || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : item.date}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">System Recorded</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 align-middle text-right">
                                            <button 
                                                onClick={() => setPreviewDoc({
                                                    title: item.ppmp_no,
                                                    previewBlobUrl: item.file ? (item.file instanceof File ? URL.createObjectURL(item.file) : item.file) : null,
                                                    previewBlobType: item.file?.type
                                                })}
                                                className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)] hover:text-emerald-700 transition-colors py-2 pl-4"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 bg-[var(--background-subtle)]/30 min-h-[400px] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                            <MdAssignment className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-400">PPMP Module</h4>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">No PPMP records found</p>
                    </div>
                )}
            </div>

            <UploadPPMPModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={(data) => {
                    fetchPPMPs();
                    setShowUploadModal(false);
                }}
            />

            <PreviewModal 
                doc={previewDoc} 
                onClose={() => setPreviewDoc(null)} 
            />
        </div>
    );
};

export default PPMP;
