import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdReceipt, MdAdd, MdVisibility, MdDelete } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import CreatePRModal from './modals/CreatePRModal';
import { documentService } from '../../services/api';

const PR = ({ user }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchPRs = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll({ 
                subDoc: 'Purchase Request'
            });
            setPrs(data);
        } catch (err) {
            console.error('Failed to fetch PRs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this PR?')) return;
        
        try {
            await documentService.delete(id);
            fetchPRs();
        } catch (err) {
            console.error('Failed to delete PR:', err);
            alert('Failed to delete PR. Please try again.');
        }
    };

    useEffect(() => {
        fetchPRs();
    }, []);

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Purchase Request"
                subtitle="Manage and track Purchase Requests."
            >
                {user?.role !== ROLES.VIEWER && (
                    <button 
                        type="button" 
                        onClick={() => setShowCreateModal(true)} 
                        className="px-6 py-2.5 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <MdAdd className="w-5 h-5" />
                        <span>New PR</span>
                    </button>
                )}
            </PageHeader>

            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">


                {prs.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 overflow-x-auto min-h-[400px]">
                        <table className="w-full border-separate border-spacing-0 table-fixed bg-white dark:bg-slate-900 shadow-sm rounded-xl overflow-hidden">
                            <colgroup>
                                <col className="w-[25%]" />
                                <col className="w-[25%]" />
                                <col className="w-[25%]" />
                                <col className="w-[25%]" />
                            </colgroup>
                            <thead className="table-header">
                                <tr>
                                    <th className="table-th !text-center !px-4">PR No.</th>
                                    <th className="table-th !text-center !px-4">PPMP No.</th>
                                    <th className="table-th !text-center !px-4">Total Cost</th>
                                    <th className="table-th !text-center !px-4">Date Uploaded</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prs.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <button 
                                                onClick={() => {
                                                    if (item.file_url) window.open(item.file_url, '_blank', 'noopener');
                                                    else alert('No file uploaded for this PR.');
                                                }}
                                                className={`text-xs font-black transition-all truncate text-center hover:text-[var(--primary)] block w-full ${item.user_pr_no ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}
                                            >
                                                {item.user_pr_no || 'No PR # Assigned'}
                                            </button>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                                                {item.ppmp_no || 'UNLINKED'}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-sm font-black text-emerald-600 font-mono whitespace-nowrap">
                                                ₱{parseFloat(item.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                                                {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : item.date || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 bg-[var(--background-subtle)]/30 min-h-[400px] flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                            <MdReceipt className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-400">No Purchase Requests</h4>
                        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-black">Generate your first PR above</p>
                    </div>
                )}
            </div>

            <CreatePRModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(data) => {
                    fetchPRs();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
};

export default PR;
