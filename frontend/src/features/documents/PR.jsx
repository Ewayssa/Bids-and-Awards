import React, { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { MdReceipt, MdAdd } from 'react-icons/md';
import { ROLES } from '../../utils/auth';
import CreatePRModal from './modals/CreatePRModal';

const PR = ({ user }) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [prs, setPrs] = useState([]);

    return (
        <div className="min-h-full pb-12">
            <PageHeader
                title="Purchase Request"
                subtitle="Manage and track Purchase Requests."
            />
            <div className="content-section overflow-hidden rounded-xl w-full max-w-[96rem] mx-auto min-w-0 p-0 shadow-lg shadow-slate-200/50">
                {user?.role !== ROLES.VIEWER && (
                    <div className="p-6 sm:p-8 border-b border-[var(--border-light)] bg-white/50 backdrop-blur-sm">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="card relative flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8 hover:shadow-[var(--shadow-lg)] transition-all duration-300 group bg-white border border-[var(--border-light)] shadow-xl shadow-slate-100/50">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)] rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="min-w-0 flex-1 text-center sm:text-left">
                                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text)] tracking-tight">Create New PR</h3>
                                    <p className="text-xs text-[var(--text-subtle)] mt-1 font-medium">Generate a new Purchase Request with line items directly in the system.</p>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreateModal(true)} 
                                    className="px-8 py-4 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center gap-2.5 w-full sm:w-auto"
                                >
                                    <MdAdd className="w-5 h-5 transition-transform group-hover:scale-110" />
                                    <span>Create PR</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {prs.length > 0 ? (
                    <div className="bg-white dark:bg-slate-900 overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Unit</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Quantity</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Unit Cost</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {prs.flatMap(pr => pr.items).map((item, idx) => {
                                    const rowTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
                                    return (
                                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 align-middle">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{item.unit || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{item.description || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 align-middle text-right">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.quantity}</span>
                                            </td>
                                            <td className="px-6 py-4 align-middle text-right">
                                                <span className="text-sm font-mono text-slate-500">
                                                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(parseFloat(item.unit_cost) || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-middle text-right">
                                                <span className="text-sm font-black text-emerald-600 font-mono">
                                                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(rowTotal)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                    const newPR = {
                        id: 'PR-' + Date.now().toString().slice(-6),
                        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                        ...data
                    };
                    setPrs(prev => [newPR, ...prev]);
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
};

export default PR;
