import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MdReceipt, 
    MdAssignmentTurnedIn, 
    MdHistory
} from 'react-icons/md';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import NotificationBell from '../notifications/NotificationBell';
import UserAccountDropdown from '../../layouts/UserAccountDropdown';

const SupplyDashboard = ({ user, onLogout }) => {
    const navigate = useNavigate();
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
        let isMounted = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/supply-dashboard/');
                if (isMounted && response.data && response.data.stats) {
                    setData(response.data);
                }
            } catch (error) {
                console.error('Error fetching supply dashboard data:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, []);

    const handleRefresh = async () => {
        try {
            setLoading(true);
            const response = await api.get('/supply-dashboard/');
            if (response.data && response.data.stats) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setLoading(false);
        }
    };

    const SupplyStat = ({ label, value, icon: Icon, colorClass, onClick }) => {
        const textClass = (colorClass || '').replace('bg-', 'text-');
        return (
            <div 
                onClick={onClick}
                className={`bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex items-center gap-6 transition-all hover:shadow-2xl hover:-translate-y-1 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
            >
                <div className={`w-16 h-16 rounded-2xl ${colorClass} bg-opacity-10 flex items-center justify-center ${textClass}`}>
                    {Icon && <Icon size={32} />}
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 pb-12">
            {/* Admin-Style Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Supply & Procurement
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                        {dateLabel}
                        <button 
                            onClick={handleRefresh}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all active:scale-95"
                            title="Refresh Data"
                        >
                            <MdHistory className={loading ? "animate-spin" : ""} size={18} />
                        </button>
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                    <NotificationBell user={user} />
                    <div className="h-8 w-px bg-slate-100" />
                    <UserAccountDropdown user={user} onLogout={onLogout} />
                </div>
            </div>            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SupplyStat 
                    label="Ready for PO" 
                    value={data.stats.ready_for_po} 
                    icon={MdAssignmentTurnedIn} 
                    colorClass="bg-emerald-500" 
                />
                <SupplyStat 
                    label="Total Issued" 
                    value={data.stats.po_generated} 
                    icon={MdReceipt} 
                    colorClass="bg-indigo-500" 
                    onClick={() => navigate('/supply/generate-po')}
                />
            </div>
            {/* Ready Queue Table (Full Width) */}
            <div className="table-container animate-in slide-in-from-bottom-4 duration-700 delay-150">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Pending Purchase Orders</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ready for PO Generation</p>
                    </div>

                </div>

                <div className="overflow-x-auto">
                    <table className="app-table table-zebra">
                        <thead>
                            <tr className="table-header-row">
                                <th className="table-th">PR Number</th>
                                <th className="table-th">Purpose & Details</th>
                                <th className="table-th">End User / Office</th>
                                <th className="table-th text-center">Total Cost</th>
                                <th className="table-th text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.recent_ready_prs.length > 0 ? (
                                data.recent_ready_prs.map((pr) => (
                                    <tr key={pr.id} className="table-tr group">
                                        <td className="table-td">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 font-mono tracking-tight">
                                                    {pr.pr_no}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                    Uploaded: {new Date(pr.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="table-td">
                                            <p className="text-sm font-bold text-slate-700 line-clamp-1 max-w-[300px]" title={pr.purpose}>
                                                {pr.purpose}
                                            </p>
                                        </td>
                                        <td className="table-td">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tight">
                                                {pr.end_user_office || 'General Office'}
                                            </span>
                                        </td>
                                        <td className="table-td text-center">
                                            <span className="text-sm font-black text-emerald-600 font-mono">
                                                ₱{parseFloat(pr.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="table-td text-right">
                                            <button 
                                                onClick={() => navigate(`/supply/generate-po?pr_id=${pr.id}`)}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 hover:shadow-indigo-500/20 active:scale-95 uppercase tracking-widest group-hover:translate-x-[-4px]"
                                            >
                                                Process PO
                                                <MdReceipt size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">NO PENDING PRs</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default SupplyDashboard;
