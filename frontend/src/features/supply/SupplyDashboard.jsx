import React, { useState, useEffect } from 'react';
import { MdReceipt, MdAssignmentTurnedIn, MdHistory } from 'react-icons/md';
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
            if (response.data && response.data.stats) {
                setData(response.data);
            } else {
                console.error('Malformed response data:', response.data);
            }
        } catch (error) {
            console.error('Error fetching supply dashboard data:', error);
            // Optional: alert('Failed to fetch latest dashboard data. Please check your connection.');
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
                        <button 
                            onClick={fetchData}
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
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SupplyStat label="Ready for PO" value={data.stats.ready_for_po} icon={MdAssignmentTurnedIn} colorClass="bg-emerald-500" />
                <SupplyStat label="Total Issued" value={data.stats.po_generated} icon={MdReceipt} colorClass="bg-indigo-500" />
            </div>

        </div>
    );
};

export default SupplyDashboard;
