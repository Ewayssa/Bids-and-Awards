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
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PPMP No.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Year</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Quarter</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Date Uploaded</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {apps.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-5 align-middle">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{item.ppmp_no}</span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.year}</span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest px-3 py-1 bg-[var(--primary)]/10 rounded-lg">
                                                {item.quarter}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-center">
                                            <span className="text-sm font-medium text-slate-500">
                                                {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : item.date}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setPreviewDoc({
                                                        title: item.ppmp_no,
                                                        previewBlobUrl: item.file ? (item.file instanceof File ? URL.createObjectURL(item.file) : item.file) : null,
                                                        previewBlobType: item.file?.type
                                                    })}
                                                    className="p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-all"
                                                    title="View Document"
                                                >
                                                    <MdVisibility className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete APP"
                                                >
                                                    <MdDelete className="w-5 h-5" />
                                                </button>
                                            </div>
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

            <PreviewModal 
                doc={previewDoc} 
                onClose={() => setPreviewDoc(null)} 
            />
        </div>
    );
};

export default APP;
