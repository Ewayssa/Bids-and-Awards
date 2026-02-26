import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    MdDashboard,
    MdPostAdd,
    MdAssessment,
    MdPeople,
    MdSettings,
    MdMenu,
    MdClose,
} from 'react-icons/md';
import { canAccessRoute, ROLES } from '../utils/roles';


//comment
const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: MdDashboard },
    { path: '/encode', label: 'Encode', icon: MdPostAdd },
    { path: '/reports', label: 'Reports', icon: MdAssessment },
    { path: '/personnel', label: 'User Management', icon: MdPeople },
    { path: '/settings', label: 'Settings', icon: MdSettings },
];

const canAccessNavItem = (item, role) => {
    // Administrators can access all menu items
    if (role === ROLES.ADMIN) return true;
    return canAccessRoute(role, item.path);
};

const Navigation = ({ user, sidebarOpen, setSidebarOpen }) => {
    const location = useLocation();
    const closeSidebar = () => setSidebarOpen?.(false);
    const toggleSidebar = () => setSidebarOpen?.((prev) => !prev);
    const isExpanded = sidebarOpen;

    const navContent = (
        <>
            <div className="flex flex-col flex-1 min-h-0">
                {/* Header: Bids and Awards Document Tracking */}
                <div className="sidebar-header px-3 py-4 md:py-5 border-b border-[var(--border-light)] transition-all duration-300 ease-out">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Desktop toggle: left when expanded or collapsed */}
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className={`hidden md:flex flex-shrink-0 items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-300 ease-out active:scale-95 sidebar-toggle-btn order-first`}
                            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <MdMenu className="w-5 h-5 shrink-0" />
                        </button>
                        <img src="/dilg-logo.png" alt="DILG Logo" className="flex-shrink-0 max-h-14 w-auto select-none sidebar-logo-full" />
                        <img src="/dilg-logo.png" alt="DILG" className="hidden flex-shrink-0 h-9 w-9 object-contain select-none sidebar-logo-collapsed" />
                        <div className="min-w-0 flex-1 sidebar-header-text">
                            <p className="text-lg font-bold text-[var(--text)] leading-tight tracking-tight">Bids and Awards</p>
                            <p className="text-base text-[var(--text-muted)] leading-snug mt-0.5">Document Tracking</p>
                        </div>
                    </div>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-2 md:px-3 py-4 overflow-y-auto overflow-x-hidden" aria-label="Main">
                    <p className="px-3 mb-3 text-[11px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider sidebar-menu-label">MENU</p>
                    <div className="space-y-1">
                        {NAV_ITEMS.filter((item) => canAccessNavItem(item, user?.role || ROLES.EMPLOYEE)).map(({ path, label, icon: Icon }) => {
                            const active = location.pathname === path;
                            return (
                                <Link
                                    key={path}
                                    to={path}
                                    onClick={closeSidebar}
                                    className={[
                                        'flex items-center gap-3 px-2 md:px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out relative group hover:translate-x-0.5 sidebar-link',
                                        active
                                            ? 'bg-[var(--primary-muted)] text-[var(--primary)] shadow-md'
                                            : 'text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] hover:shadow-md',
                                    ].join(' ')}
                                    title={!isExpanded ? label : undefined}
                                >
                                    {active && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--primary)] rounded-r-full shadow-sm sidebar-active-bar" aria-hidden />
                                    )}
                                    <span
                                        className={[
                                            'flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-all duration-300 ease-out',
                                            active 
                                                ? 'bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm scale-105' 
                                                : 'text-[var(--text-subtle)] group-hover:scale-105 group-hover:bg-[var(--background-subtle)]',
                                        ].join(' ')}
                                    >
                                        <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                                    </span>
                                    <span className="truncate font-medium sidebar-link-text">{label}</span>
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
                    <span className="text-lg font-bold text-[var(--text)] truncate">Bids and Awards</span>
                </div>
            </header>

            {/* Backdrop when sidebar open on mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
                    aria-hidden
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar: fixed drawer on mobile; in-flow on desktop so flex is [sidebar][main], no gap */}
            <aside
                className={[
                    'fixed inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col z-40 sidebar-shell flex-shrink-0',
                    'transform transition-[transform,width] duration-300 ease-out',
                    'md:translate-x-0 md:relative md:left-auto md:top-auto md:bottom-auto md:inset-auto md:min-h-screen',
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
