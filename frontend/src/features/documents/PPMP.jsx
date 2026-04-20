import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdAssignment, MdUpload, MdVisibility } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import UploadPPMPModal from './modals/UploadPPMPModal';
import PreviewModal from './modals/PreviewModal';

const PPMP = ({ user }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [ppmps, setPpmps] = useState([]);
    const [previewDoc, setPreviewDoc] = useState(null);

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Project Procurement Management Plan (PPMP)"
                subtitle="Manage and track PPMP records."
            />
            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">
                
                {user?.role !== ROLES.VIEWER && (
                    <div className="p-6 sm:p-8 border-b border-[var(--border-light)] bg-white/50 backdrop-blur-sm">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white border border-[var(--border-light)] shadow-xl shadow-slate-100/50">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)] rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Add New PPMP</h3>
                                    <p className="text-xs text-[var(--text-subtle)] mt-1 font-medium">Upload a new Project Procurement Management Plan to the system.</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowUploadModal(true)} 
                                    className="px-8 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full sm:w-auto"
                                >
                                    <MdUpload className="w-5 h-5 transition-transform group-hover:scale-110" />
                                    <span>Upload PPMP</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {ppmps.length > 0 ? (
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
                                {ppmps.map((item, idx) => (
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
                                            <span className="text-sm font-medium text-slate-500">{item.date}</span>
                                        </td>
                                        <td className="px-6 py-5 align-middle text-right">
                                            <button 
                                                onClick={() => setPreviewDoc({
                                                    title: item.ppmp_no,
                                                    previewBlobUrl: item.file ? URL.createObjectURL(item.file) : null,
                                                    previewBlobType: item.file?.type
                                                })}
                                                className="p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-xl transition-all"
                                                title="View Document"
                                            >
                                                <MdVisibility className="w-5 h-5" />
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
                    const newPPMP = {
                        ...data,
                        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    };
                    setPpmps(prev => [newPPMP, ...prev]);
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
