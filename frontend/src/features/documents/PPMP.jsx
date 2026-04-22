import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdAssignment, MdUpload } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import UploadPPMPModal from './modals/UploadPPMPModal';
import { documentService } from '../../services/api';

const PPMP = ({ user }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [ppmps, setPpmps] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleView = (item) => {
        // Find the record ID (some older records might store it differently in state)
        const docId = item.id || item.pk;
        
        if (!docId) {
            // Fallback: If no ID, try to open the file URL directly
            if (item.file_url) {
                window.open(item.file_url, '_blank', 'noopener,noreferrer');
            } else {
                alert('Cannot view this document: No file found.');
            }
            return;
        }

        // Use the new preview endpoint for better viewing (inline)
        const previewUrl = `${window.location.origin}/api/upload/${docId}/preview/`;
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
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
                title="Project Procurement Management Plan"
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
                        <table className="w-full border-separate border-spacing-0 table-fixed bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden">
                            <colgroup>
                                <col className="w-[18%]" />
                                <col className="w-[18%]" />
                                <col className="w-[18%]" />
                                <col className="w-[28%]" />
                                <col className="w-[18%]" />
                            </colgroup>
                            <thead className="table-header">
                                <tr>
                                    <th className="table-th !text-center !px-4">PPMP No.</th>
                                    <th className="table-th !text-center !px-4">Year</th>
                                    <th className="table-th !text-center !px-4">Quarter</th>
                                    <th className="table-th !text-center !px-4">Date Uploaded</th>
                                    <th className="table-th !text-center !px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ppmps.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate block">
                                                {item.ppmp_no || 'No PPMP #'}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-700">
                                                {item.year || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="inline-block text-[10px] font-black text-[var(--primary)] uppercase tracking-widest px-3 py-1 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20 shadow-sm">
                                                {item.quarter || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                                {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : item.date}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <button 
                                                onClick={() => handleView(item)}
                                                className="btn-action-ghost !text-[10px] !py-1"
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
        </div>
    );
};

export default PPMP;
