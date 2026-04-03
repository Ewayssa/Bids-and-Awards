import React, { useState, useRef, useEffect } from 'react';
import { MdExpandMore, MdLogout } from 'react-icons/md';
import { getRoleDisplayName } from '../utils/auth';

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
                className="inline-flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--background-subtle)] hover:text-[var(--text)] transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={`Account menu for ${displayName}`}
            >
                <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=32&background=16a34a&color=fff&bold=true`}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-2 ring-[var(--primary)]/20"
                />
                <span className="text-[var(--text)] truncate max-w-[110px] sm:max-w-[160px] text-sm font-medium">{displayName}</span>
                <MdExpandMore
                    className={`w-4 h-4 text-[var(--text-subtle)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)] z-[9999]"
                    role="menu"
                >
                    {/* User header */}
                    <div className="px-4 pt-4 pb-3 border-b border-[var(--border-light)]">
                        <div className="flex items-center gap-3">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=40&background=16a34a&color=fff&bold=true`}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-[var(--text)] truncate text-sm">{displayName}</p>
                                <p className="text-xs text-[var(--text-subtle)] truncate mt-0.5">{roleDisplay}</p>
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
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left rounded-b-xl"
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
