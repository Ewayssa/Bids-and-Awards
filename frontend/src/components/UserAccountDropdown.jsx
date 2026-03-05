import React, { useState, useRef, useEffect } from 'react';
import { MdExpandMore, MdLogout } from 'react-icons/md';
import { getRoleDisplayName } from '../utils/roles';

const UserAccountDropdown = ({ user, onLogout, className = '' }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const displayName = user?.fullName || user?.username || 'User';
    const roleDisplay = getRoleDisplayName(user?.role);

    return (
        <div ref={dropdownRef} className={`relative inline-flex ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={`Account menu for ${displayName}`}
            >
                <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=32&background=D4140F&color=fff&bold=true`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[var(--border-light)]"
                />
                <span className="text-[var(--text)] truncate max-w-[110px] sm:max-w-[200px]">Hi, {displayName}</span>
                <MdExpandMore
                    className={`w-5 h-5 text-[var(--text-subtle)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_8px_16px_-8px_rgba(0,0,0,0.08)] z-[9999]"
                    role="menu"
                >
                    {/* Popover arrow – points up at trigger */}
                    <div
                        className="absolute -top-1.5 right-5 w-3 h-3 rotate-45 bg-[var(--surface)] border-l border-t border-[var(--border-light)]"
                        aria-hidden
                    />
                    {/* User header – popover style */}
                    <div className="px-4 pt-5 pb-4 bg-[var(--background-subtle)] border-b border-[var(--border-light)]">
                        <div className="flex items-center gap-3">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=48&background=D4140F&color=fff&bold=true`}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-[var(--border-light)]"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[var(--text)] truncate">{displayName}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate">{roleDisplay}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                onLogout?.();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                            role="menuitem"
                        >
                            <MdLogout className="w-4 h-4 flex-shrink-0" />
                            Log out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAccountDropdown;
