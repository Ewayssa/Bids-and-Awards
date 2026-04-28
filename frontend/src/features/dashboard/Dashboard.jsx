import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLES, mapOldRoleToNew } from '../../utils/auth';
import NotificationBell from '../notifications/NotificationBell';
import PageHeader from '../../components/PageHeader';
import UserAccountDropdown from '../../layouts/UserAccountDropdown';

import { useDashboard } from '../../hooks/useDashboard';
import { StatsGrid } from '../../components/StatsGrid';
import { DashboardCalendar } from './DashboardCalendar';
import { ProcurementProgress } from '../documents/ProcurementProgress';
import { EventModals } from './EventModals';

const Dashboard = ({ user, onLogout }) => {
    const location = useLocation();
    const { 
        stats, 
        loading, 
        ringProgress, 
        loadData 
    } = useDashboard(user);

    const [eventModal, setEventModal] = useState(null);
    const [editEventModal, setEditEventModal] = useState(null);

    const isAdmin = mapOldRoleToNew(user?.role) === ROLES.ADMIN;
    const dateLabel = new Date().toLocaleDateString('en-PH', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });

    if (location.pathname !== '/') return null;

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* High-End Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                        {dateLabel}
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                    <NotificationBell user={user} />
                    <div className="h-8 w-px bg-slate-100" />
                    <UserAccountDropdown user={user} onLogout={onLogout} />
                </div>
            </div>

            <div className="space-y-8">
                {/* Top Stats - Floating Style */}
                <StatsGrid loading={loading} stats={stats} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden transition-all duration-500 hover:shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-50">
                            <p className="text-xl font-black text-slate-800 tracking-tight">Calendar Events</p>
                        </div>
                        <DashboardCalendar 
                            events={stats.calendarEvents} 
                            isAdmin={isAdmin} 
                            onOpenAddEvent={(date) => setEventModal({ date })}
                            onOpenEditEvent={(ev) => setEditEventModal({ ev })}
                        />
                    </div>
                    
                    <ProcurementProgress 
                        pieData={stats.pieData} 
                        procurementMethodCounts={stats.procurementMethodCounts} 
                        ringProgress={ringProgress} 
                        loading={loading}
                    />
                </div>
            </div>

            <EventModals 
                eventModal={eventModal}
                setEventModal={setEventModal}
                editEventModal={editEventModal}
                setEditEventModal={setEditEventModal}
                onRefresh={loadData}
            />
        </div>
    );
};

export default Dashboard;
