import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdDateRange, MdUpload, MdVisibility, MdDelete } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import UploadAPPModal from './modals/UploadAPPModal';
import PreviewModal from './modals/PreviewModal';
import { documentService } from '../../services/api';

const APP = ({ user }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);

    const fetchAPPs = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll({ 
                subDoc: 'Annual Procurement Plan'
            });
            setApps(data);
        } catch (err) {
            console.error('Failed to fetch APPs:', err);
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
        if (!window.confirm('Are you sure you want to delete this APP?')) return;
        
        try {
            await documentService.delete(id);
            fetchAPPs();
        } catch (err) {
            console.error('Failed to delete APP:', err);
            alert('Failed to delete APP. Please try again.');
        }
    };

    useEffect(() => {
        fetchAPPs();
    }, []);

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Annual Procurement Plan"
                subtitle="Manage and track APP records."
            >
                {user?.role !== ROLES.VIEWER && (
                    <button 
                        type="button" 
                        onClick={() => setShowUploadModal(true)} 
                        className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <MdUpload className="w-5 h-5" />
                        <span>Upload APP</span>
                    </button>
                )}
            </PageHeader>

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">

                
                {apps.length > 0 ? (
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
                                {apps.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate block">
                                                {item.ppmp_no || 'No APP #'}
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
                                                className="px-6 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-full font-black uppercase tracking-widest text-[9px] hover:scale-110 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
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
                            <MdDateRange className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-400">APP Module</h4>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">No APP records found</p>
                    </div>
                )}
            </div>

            <UploadAPPModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onSuccess={(data) => {
                    fetchAPPs();
                    setShowUploadModal(false);
                }}
            />

            {/* Preview logic removed as per user preference for new tab viewing */}
        </div>
    );
};

export default APP;
