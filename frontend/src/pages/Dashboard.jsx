import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROLES, mapOldRoleToNew } from '../utils/auth';
import NotificationBell from '../components/NotificationBell';
import PageHeader from '../components/PageHeader';
import UserAccountDropdown from '../components/UserAccountDropdown';

import { useDashboard } from '../hooks/useDashboard';
import { StatsGrid } from '../components/StatsGrid';
import { DashboardCalendar } from '../components/DashboardCalendar';
import { ProcurementProgress } from '../components/ProcurementProgress';
import { EventModals } from '../components/EventModals';

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
        <div className="space-y-5 pb-8">
            <PageHeader
                title="BAC Dashboard"
                subtitle={dateLabel}
                titleSize="default"
            >
                <div className="flex items-center gap-3">
                    <NotificationBell user={user} />
                    <UserAccountDropdown user={user} onLogout={onLogout} />
                </div>
            </PageHeader>

            <div className="content-section overflow-hidden rounded-xl p-0">
                <div className="p-6 sm:p-7 border-b border-[var(--border-light)]">
                    <StatsGrid loading={loading} stats={stats} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 w-full dashboard-grid">
                    <DashboardCalendar 
                        events={stats.calendarEvents} 
                        isAdmin={isAdmin} 
                        onOpenAddEvent={(date) => setEventModal({ date })}
                        onOpenEditEvent={(ev) => setEditEventModal({ ev })}
                    />
                    
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
