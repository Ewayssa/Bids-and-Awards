import React, { useState, useEffect } from 'react';
import { MdReceipt, MdAssignmentTurnedIn, MdPendingActions, MdHistory, MdArrowForward } from 'react-icons/md';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageHeader from '../../components/PageHeader';
import NotificationBell from '../notifications/NotificationBell';
import UserAccountDropdown from '../../layouts/UserAccountDropdown';

const SupplyDashboard = ({ user, onLogout }) => {
    const [data, setData] = useState({
        stats: {
            ready_for_po: 0,
            pending_po: 0,
            po_generated: 0
        },
        recent_ready_prs: [],
        recent_pos: []
    });
    const [loading, setLoading] = useState(true);

    const dateLabel = new Date().toLocaleDateString('en-PH', { 
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' 
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/supply-dashboard/');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching supply dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const SupplyStat = ({ label, value, icon: Icon, colorClass }) => (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className={`w-16 h-16 rounded-2xl ${colorClass} bg-opacity-10 flex items-center justify-center ${colorClass.replace('bg-', 'text-')}`}>
                <Icon size={32} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 pb-12 animate-in fade-in duration-700">
            {/* Admin-Style Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Supply & Procurement
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                        {dateLabel}
                    </p>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <SupplyStat label="Ready for PO" value={data.stats.ready_for_po} icon={MdAssignmentTurnedIn} colorClass="bg-emerald-500" />
                <SupplyStat label="In Progress" value={data.stats.pending_po} icon={MdPendingActions} colorClass="bg-amber-500" />
                <SupplyStat label="Total Issued" value={data.stats.po_generated} icon={MdReceipt} colorClass="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ready List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Pending PRs</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Ready for Purchase Order Generation</p>
                        </div>
                        <MdAssignmentTurnedIn className="text-emerald-500 opacity-20" size={32} />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                        {data.recent_ready_prs.length > 0 ? data.recent_ready_prs.map(pr => (
                            <div key={pr.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{pr.title}</p>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded inline-block">{pr.user_pr_no || pr.prNo}</p>
                                </div>
                                <Link to="/supply/generate-po" className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                                    Generate PO <MdArrowForward size={14} />
                                </Link>
                            </div>
                        )) : (
                            <div className="p-16 text-center space-y-3">
                                <MdAssignmentTurnedIn className="mx-auto text-slate-200" size={48} />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No pending PRs</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Latest Issued Purchase Orders</p>
                        </div>
                        <Link to="/supply/generate-po" className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest transition-all">View All Records</Link>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                        {data.recent_pos.length > 0 ? data.recent_pos.map(po => (
                            <div key={po.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900 leading-tight">{po.po_no}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">{po.supplier_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900 tracking-tighter">₱{Number(po.final_total_amount).toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Success</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-16 text-center space-y-3">
                                <MdHistory className="mx-auto text-slate-200" size={48} />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplyDashboard;
