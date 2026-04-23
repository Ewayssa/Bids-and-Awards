import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdReceipt, MdAdd, MdCheck, MdClose } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import CreatePRModal from './modals/CreatePRModal';
import DocViewModal from './modals/DocViewModal';
import { generatePR_Excel } from '../../utils/prGenerator';
import { documentService } from '../../services/api';

const PR = ({ user }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [editingPrId, setEditingPrId] = useState(null);
    const [assignValue, setAssignValue] = useState('');
    const [assigning, setAssigning] = useState(false);

    const isAdmin = user?.role === ROLES.ADMIN;
    const isMember = user?.role === ROLES.MEMBER;
    const canAssignPR = isAdmin || isMember;

    const handleQuickView = (item) => {
        try {
            if (item.file_url) {
                window.open(item.file_url, '_blank', 'noopener');
            } else {
                // Defensive parsing for pr_items
                let items = [];
                try {
                    if (typeof item.pr_items === 'string' && item.pr_items.trim()) {
                        items = JSON.parse(item.pr_items);
                    } else if (Array.isArray(item.pr_items)) {
                        items = item.pr_items;
                    }
                } catch (e) {
                    console.error('Data parsing error:', e);
                }

                const prData = {
                    items: items,
                    total: item.total_amount,
                    ppmp_no: item.ppmp_no,
                    prNo: item.user_pr_no || '',
                    title: item.title,
                    office: item.end_user_office || ''
                };
                generatePR_Excel(prData);
            }
        } catch (err) {
            console.error('Quick view failed:', err);
            // Fallback: Open the modal if generation fails
            setSelectedDoc(item);
        }
    };

    const fetchPRs = async () => {
        setLoading(true);
        try {
            const data = await documentService.getAll({ 
                subDoc: 'Purchase Request'
            });
            setPrs(data);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const handleAssignPR = async (item) => {
        if (!assignValue.trim() || assigning) return;
        setAssigning(true);
        try {
            await documentService.assignPRNo(item.id, assignValue.trim());
            await fetchPRs();
            setEditingPrId(null);
            setAssignValue('');
        } catch (err) {
            console.error('Failed to assign PR #:', err);
            alert(err.response?.data?.error || 'Failed to assign PR #. Please check if the number is already used.');
        } finally {
            setAssigning(false);
        }
    };

    const startEditing = (item) => {
        setEditingPrId(item.id);
        setAssignValue(item.user_pr_no || '');
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
                                <col className="w-[20%]" />
                                <col className="w-[15%]" />
                                <col className="w-[25%]" />
                                <col className="w-[15%]" />
                            </colgroup>
                            <thead className="table-header">
                                <tr>
                                    <th className="table-th !text-center !px-4">PR No.</th>
                                    <th className="table-th !text-center !px-4">PPMP No.</th>
                                    <th className="table-th !text-center !px-4">Total Cost</th>
                                    <th className="table-th !text-center !px-4">Date Uploaded</th>
                                    <th className="table-th !text-center !px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prs.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <button 
                                                onClick={() => handleQuickView(item)}
                                                className={`text-xs font-black transition-all truncate text-center hover:text-slate-900 dark:hover:text-white block w-full ${item.user_pr_no ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 italic'}`}
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
                                        <td className="table-td !text-center !px-4 !py-3 border-b border-slate-50 dark:border-slate-800/50">
                                            <div className="flex justify-center items-center gap-2">
                                                {editingPrId === item.id ? (
                                                    <div className="flex items-center justify-center gap-1.5 animate-in slide-in-from-right duration-200">
                                                        <input 
                                                            autoFocus
                                                            type="text"
                                                            value={assignValue}
                                                            onChange={(e) => setAssignValue(e.target.value)}
                                                            className="h-8 w-24 px-2 bg-white border-2 border-emerald-500 rounded text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                                                            placeholder="PR #"
                                                        />
                                                        <button 
                                                            disabled={assigning || !assignValue.trim()}
                                                            onClick={() => handleAssignPR(item)}
                                                            className="w-8 h-8 flex items-center justify-center bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-90 shadow-sm"
                                                        >
                                                            {assigning ? <div className="w-3 h-3 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <MdCheck className="w-5 h-5" />}
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingPrId(null)}
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                                        >
                                                            <MdClose className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {canAssignPR && (
                                                            <button 
                                                                onClick={() => startEditing(item)}
                                                                className="btn-action-ghost !text-emerald-600 !border-emerald-100 hover:!bg-emerald-50 !text-[10px] !py-1"
                                                            >
                                                                {item.user_pr_no ? 'Update PR #' : 'Assign PR #'}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleQuickView(item)}
                                                            className="btn-action-ghost !text-[10px] !py-1"
                                                            title="Download PR"
                                                        >
                                                            Download
                                                        </button>
                                                    </>
                                                )}
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

            {selectedDoc && (
                <DocViewModal 
                    doc={selectedDoc} 
                    onClose={() => setSelectedDoc(null)} 
                />
            )}
        </div>
    );
};

export default PR;
