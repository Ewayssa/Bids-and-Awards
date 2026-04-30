import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    MdSpaceDashboard,
    MdDescription,
    MdTableChart,
    MdGroup,
    MdTune,
    MdMenu,
    MdClose,
    MdHistoryToggleOff,
    MdAssignment,
    MdDateRange,
    MdReceipt,
    MdPostAdd,
    MdHistory,
    MdLogout,
} from 'react-icons/md';
import { canAccessRoute, ROLES } from '../utils/auth';
import NotificationBell from '../features/notifications/NotificationBell';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: MdSpaceDashboard },
    { path: '/encode', label: 'Procurement Records', icon: MdDescription },
    { path: '/ppmp', label: 'PPMP', icon: MdAssignment },
    { path: '/app', label: 'APP', icon: MdDateRange },
    { path: '/pr', label: 'Purchase Request', icon: MdReceipt },
    { path: '/supply/generate-po', label: 'Purchase Orders', icon: MdPostAdd },

    { path: '/personnel', label: 'User Management', icon: MdGroup },
    { path: '/audit-trail', label: 'Activity Logs', icon: MdHistoryToggleOff },
];

const canAccessNavItem = (item, role) => {
    // Administrators can access all menu items
    if (role === ROLES.ADMIN) return true;
    return canAccessRoute(role, item.path);
};

const Navigation = ({ user, sidebarOpen, setSidebarOpen, onLogout }) => {
    const location = useLocation();
    const closeSidebar = () => setSidebarOpen?.(false);
    const toggleSidebar = () => setSidebarOpen?.((prev) => !prev);
    const isExpanded = sidebarOpen;

    const navContent = (
        <>
            <div className="flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="sidebar-header px-3 py-4 md:py-5 border-b border-[var(--border-light)] transition-all duration-300 ease-out">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className={`hidden md:flex flex-shrink-0 items-center justify-center w-8 h-8 rounded-lg text-[var(--text-subtle)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-200 ease-out active:scale-95 sidebar-toggle-btn order-first`}
                            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <MdMenu className="w-5 h-5 shrink-0" />
                        </button>
                        <img src="/dilg-logo.png" alt="DILG Logo" className="flex-shrink-0 max-h-12 w-auto select-none sidebar-logo-full" />
                        <img src="/dilg-logo.png" alt="DILG" className="hidden flex-shrink-0 h-8 w-8 object-contain select-none sidebar-logo-collapsed" />
                        <div className="min-w-0 flex-1 sidebar-header-text">
                            <p className="text-sm font-bold text-[var(--text)] leading-tight tracking-tight">Bids and Award Committee</p>
                            <p className="text-xs text-[var(--text-subtle)] leading-snug mt-0.5 font-medium">Procurement Management System</p>
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-2 md:px-3 py-4 overflow-y-auto overflow-x-hidden" aria-label="Main">
                    <p className="px-2 mb-2 text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest sidebar-menu-label">Menu</p>
                    <div className="space-y-0.5">
                        {NAV_ITEMS.filter((item) => canAccessNavItem(item, user?.role || ROLES.USER)).map(({ path, label, icon: Icon }) => {
                            const active = location.pathname === path;
                            return (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={closeSidebar}
                                    className={[
                                        'flex items-center gap-3 px-2 md:px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out relative group sidebar-link',
                                        active
                                            ? 'bg-[var(--primary-muted)] text-[var(--primary)]'
                                            : 'text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)]',
                                    ].join(' ')}
                                    title={!isExpanded ? label : undefined}
                                >
                                    {active && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[var(--primary)] rounded-r-full sidebar-active-bar" aria-hidden />
                                    )}
                                    <span
                                        className={[
                                            'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200 ease-out',
                                            active
                                                ? 'bg-[var(--primary)] text-white shadow-sm'
                                                : 'text-[var(--text-subtle)] group-hover:text-[var(--primary)] group-hover:bg-[var(--primary-muted)]',
                                        ].join(' ')}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </span>
                                    <span className="truncate sidebar-link-text">{label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </>

    );

    return (
        <>
            {/* Mobile top bar */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-40 flex items-center gap-3 px-4 md:hidden shadow-sm">
                <button
                    type="button"
                    onClick={() => setSidebarOpen?.((prev) => !prev)}
                    className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-300 ease-out active:scale-95"
                    aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={sidebarOpen}
                >
                    {sidebarOpen ? <MdClose className="w-6 h-6 transition-transform duration-300" /> : <MdMenu className="w-6 h-6 transition-transform duration-300" />}
                </button>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img src="/dilg-logo.png" alt="DILG Logo" className="max-h-10 w-auto flex-shrink-0 select-none" />
                    <span className="text-lg font-bold text-[var(--text)] truncate">Bids and Award Committee</span>
                </div>
                <div className="flex-shrink-0">
                    <NotificationBell user={user} />
                </div>
            </header>

            {/* Backdrop when sidebar open on mobile */}
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden transition-all duration-300 ${sidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
                aria-hidden
                onClick={closeSidebar}
            />

            {/* Sidebar: fixed drawer on mobile; in-flow on desktop so flex is [sidebar][main], no gap */}
            <aside
                className={[
                    'fixed inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col z-40 sidebar-shell flex-shrink-0',
                    'transform transition-[transform,width] duration-300 ease-out',
                    'md:translate-x-0 md:sticky md:top-0 md:h-screen',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                    isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed',
                ].join(' ')}
            >
                <div className="sidebar-shell-inner">
                    {navContent}
                </div>
            </aside>
        </>
    );
};

export default Navigation;
