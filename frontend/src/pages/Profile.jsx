import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { userService } from '../services/api';
import {
    MdPerson,
    MdEmail,
    MdWork,
    MdBusiness,
    MdBadge,
    MdEdit,
    MdVisibility,
    MdVisibilityOff,
    MdLock,
    MdCameraAlt,
} from 'react-icons/md';
import { getRoleDisplayName, ROLES } from '../utils/auth';

const STORAGE_KEY_PHOTO = (username) => `bac_profile_photo_${username}`;
const MAX_PHOTO_SIZE = 150 * 1024; // 150KB for localStorage

function getInitials(fullName, username) {
    const name = (fullName || username || '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getPasswordStrength(password) {
    if (!password) return { level: 'none', label: '', valid: false };
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const criteriaMet = [hasMinLen, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    const valid = hasMinLen && hasUpper && hasNumber && hasSpecial;
    if (criteriaMet <= 1 || !hasMinLen) return { level: 'weak', label: 'Weak', valid: false };
    if (criteriaMet <= 3) return { level: 'medium', label: 'Medium', valid: false };
    return { level: 'strong', label: 'Strong', valid: true };
}

const Profile = ({ user, onUserUpdated }) => {
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [position, setPosition] = useState(user?.position || '');
    const [office, setOffice] = useState(user?.office || '');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profilePassword, setProfilePassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [showConfirmProfile, setShowConfirmProfile] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [toast, setToast] = useState(null);

    const isAdmin = user?.role === ROLES.ADMIN;

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        const u = user?.username;
        if (!u) return;
        try {
            const photo = localStorage.getItem(STORAGE_KEY_PHOTO(u));
            if (photo) setProfilePhoto(photo);
        } catch (_) {}
    }, [user?.username]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileError('');
        if (!profilePassword.trim()) {
            setProfileError('Enter your current password to save changes.');
            return;
        }
        setShowConfirmProfile(true);
    };

    const confirmProfileSubmit = async () => {
        setProfileLoading(true);
        setShowConfirmProfile(false);
        try {
            const updated = await userService.updateProfile(
                user.username,
                profilePassword,
                fullName.trim() || undefined,
                isAdmin ? (position.trim() || undefined) : undefined,
                isAdmin ? (office.trim() || undefined) : undefined
            );
            setProfilePassword('');
            setFullName(updated.fullName || '');
            if (isAdmin) {
                setPosition(updated.position || '');
                setOffice(updated.office || '');
            }
            setEditingProfile(false);
            onUserUpdated?.({ ...user, fullName: updated.fullName || user.fullName, position: updated.position ?? user.position, office: updated.office ?? user.office });
            showToast('Account details updated successfully.', 'success');
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to update account.';
            setProfileError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            if (String(msg).toLowerCase().includes('incorrect')) showToast('Current password is incorrect.', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const strength = getPasswordStrength(newPassword);
        if (!strength.valid) {
            setError('Password must have at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }
        setShowConfirmPassword(true);
    };

    const confirmPasswordSubmit = async () => {
        setLoading(true);
        setShowConfirmPassword(false);
        try {
            await userService.changePassword(user.username, currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            showToast('Password updated successfully.', 'success');
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to change password.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            if (String(msg).toLowerCase().includes('incorrect')) showToast('Current password is incorrect.', 'error');
        } finally {
            setLoading(false);
        }
    };


    const handlePhotoChange = (e) => {
        const file = e.target?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            let dataUrl = reader.result;
            if (dataUrl.length > MAX_PHOTO_SIZE) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, Math.sqrt(MAX_PHOTO_SIZE / (dataUrl.length * 0.75)));
                    canvas.width = Math.max(1, Math.floor(img.width * scale));
                    canvas.height = Math.max(1, Math.floor(img.height * scale));
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setProfilePhoto(dataUrl);
                    if (user?.username) {
                        try {
                            localStorage.setItem(STORAGE_KEY_PHOTO(user.username), dataUrl);
                        } catch (_) {}
                    }
                };
                img.src = dataUrl;
            } else {
                setProfilePhoto(dataUrl);
                if (user?.username) {
                    try {
                        localStorage.setItem(STORAGE_KEY_PHOTO(user.username), dataUrl);
                    } catch (_) {}
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const roleDisplay = getRoleDisplayName(user?.role);
    const passwordStrength = getPasswordStrength(newPassword);

    const confirmProfileContent = showConfirmProfile && (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="confirm-profile-title"
        >
            <div className="card-elevated max-w-sm w-full p-6 rounded-2xl border-0 shadow-2xl bg-[var(--surface)] animate-in zoom-in-95 duration-200">
                <h2 id="confirm-profile-title" className="text-lg font-semibold text-[var(--text)] mb-2">Confirm Update</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                    Are you sure you want to save changes to your account details?
                </p>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setShowConfirmProfile(false)} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={confirmProfileSubmit} className="btn-primary" disabled={profileLoading}>
                        {profileLoading ? 'Saving…' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );

    const confirmPasswordContent = showConfirmPassword && (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="alertdialog"
            aria-labelledby="confirm-password-title"
        >
            <div className="card-elevated max-w-sm w-full p-6 rounded-2xl border-0 shadow-2xl bg-[var(--surface)] animate-in zoom-in-95 duration-200">
                <h2 id="confirm-password-title" className="text-lg font-semibold text-[var(--text)] mb-2">Confirm Password Change</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                    Are you sure you want to change your password? You will need to use the new password on your next login.
                </p>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setShowConfirmPassword(false)} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={confirmPasswordSubmit} className="btn-primary" disabled={loading}>
                        {loading ? 'Updating…' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-10">
            <header>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
                    Account Settings
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account and security.</p>
            </header>

            {/* Toast notifications */}
            {toast && (
                <div
                    role="alert"
                    className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-fade-in ${
                        toast.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-green-50 border-green-200 text-green-800'
                    }`}
                >
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            <div className="max-w-2xl w-full mx-auto space-y-6">
                {/* My Account card */}
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-md)] overflow-hidden w-full">
                    <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between gap-4">
                        <h2 className="text-base font-semibold text-[var(--text)]">My Account</h2>
                        {!editingProfile ? (
                            <button
                                type="button"
                                onClick={() => setEditingProfile(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-muted)] rounded-lg transition-colors"
                            >
                                <MdEdit className="w-4 h-4" />
                                Edit
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingProfile(false);
                                    setProfilePassword('');
                                    setProfileError('');
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                    <div className="p-5 sm:p-6">
                        {!editingProfile ? (
                            <>
                                {/* Avatar + name block */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 mb-6 border-b border-[var(--border-light)]">
                                    <div className="relative group flex-shrink-0">
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--primary-muted)] flex items-center justify-center overflow-hidden border-2 border-[var(--border-light)] text-xl sm:text-2xl font-semibold text-[var(--primary)]">
                                            {profilePhoto ? (
                                                <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(fullName, user?.username)
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <MdCameraAlt className="w-8 h-8 text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                onChange={handlePhotoChange}
                                                aria-label="Upload profile photo"
                                            />
                                        </label>
                                    </div>
                                    <div className="text-center sm:text-left min-w-0">
                                        <p className="text-base font-semibold text-[var(--text)]">{fullName || '—'}</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-0.5">{user?.username || '—'}</p>
                                    </div>
                                </div>
                                {/* Info rows: icon + label/value, 2-col on sm */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0">
                                            <MdPerson className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Full Name</p>
                                            <p className="text-sm text-[var(--text)] mt-0.5">{fullName || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0">
                                            <MdEmail className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Email</p>
                                            <p className="text-sm text-[var(--text)] break-all mt-0.5">{user?.username || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0">
                                            <MdWork className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Position</p>
                                            <p className="text-sm text-[var(--text)] mt-0.5">{position || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0">
                                            <MdBusiness className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Department</p>
                                            <p className="text-sm text-[var(--text)] mt-0.5">{office || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0">
                                            <MdBadge className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Role</p>
                                            <p className="text-sm text-[var(--text)] mt-0.5">{roleDisplay}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleProfileSubmit} className="space-y-6">
                                {/* Avatar + form grid */}
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="flex flex-col items-center sm:items-start gap-2 flex-shrink-0">
                                        <div className="relative group">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--primary-muted)] flex items-center justify-center overflow-hidden border-2 border-[var(--border-light)] text-xl sm:text-2xl font-semibold text-[var(--primary)]">
                                                {profilePhoto ? (
                                                    <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    getInitials(fullName, user?.username)
                                                )}
                                            </div>
                                            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <MdCameraAlt className="w-8 h-8 text-white" />
                                                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} aria-label="Upload profile photo" />
                                            </label>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">Click to change photo</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
                                        <div className="sm:col-span-2 flex gap-3 items-start">
                                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0 mt-1">
                                                <MdEmail className="w-5 h-5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="profile-email" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Email</label>
                                                <input
                                                    id="profile-email"
                                                    type="text"
                                                    value={user?.username || ''}
                                                    className="input-field w-full bg-[var(--background-subtle)]"
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0 mt-1">
                                                <MdPerson className="w-5 h-5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="profile-fullName" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Full Name</label>
                                                <input
                                                    id="profile-fullName"
                                                    type="text"
                                                    className="input-field w-full"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Your display name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0 mt-1">
                                                <MdWork className="w-5 h-5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="profile-position" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Position</label>
                                                <input
                                                    id="profile-position"
                                                    type="text"
                                                    className="input-field w-full bg-[var(--background-subtle)]"
                                                    value={position}
                                                    onChange={(e) => setPosition(e.target.value)}
                                                    placeholder="e.g. BAC Member"
                                                    readOnly={!isAdmin}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-start">
                                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0 mt-1">
                                                <MdBusiness className="w-5 h-5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="profile-office" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Department</label>
                                                <input
                                                    id="profile-office"
                                                    type="text"
                                                    className="input-field w-full bg-[var(--background-subtle)]"
                                                    value={office}
                                                    onChange={(e) => setOffice(e.target.value)}
                                                    placeholder="e.g. Procurement"
                                                    readOnly={!isAdmin}
                                                    disabled={!isAdmin}
                                                />
                                            </div>
                                        </div>
                                        <div className="sm:col-span-2 flex gap-3 items-start">
                                            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--background-subtle)] text-[var(--text-muted)] flex-shrink-0 mt-1">
                                                <MdLock className="w-5 h-5" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="profile-verify-password" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Current password (required to save)</label>
                                                <input
                                                    id="profile-verify-password"
                                                    type="password"
                                                    className="input-field w-full"
                                                    value={profilePassword}
                                                    onChange={(e) => setProfilePassword(e.target.value)}
                                                    placeholder="Enter password to confirm changes"
                                                    autoComplete="current-password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {profileError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
                                        {profileError}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingProfile(false);
                                            setProfilePassword('');
                                            setProfileError('');
                                        }}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={profileLoading} className="btn-primary inline-flex items-center justify-center gap-2 min-w-[120px]">
                                        {profileLoading && (
                                            <span className="w-4 h-4 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin" aria-hidden />
                                        )}
                                        {profileLoading ? 'Saving…' : 'Save changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Change Password card */}
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border-light)] shadow-[var(--shadow-md)] overflow-hidden w-full">
                    <div className="px-5 sm:px-6 py-4 border-b border-[var(--border-light)]">
                        <h2 className="text-base font-semibold text-[var(--text)]">Change Password</h2>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="p-5 sm:p-6 space-y-5">
                        <div>
                            <label htmlFor="profile-current-password" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Current password</label>
                            <div className="relative">
                                <input
                                    id="profile-current-password"
                                    type={showCurrent ? 'text' : 'password'}
                                    className="input-field w-full pr-10"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowCurrent((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
                                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                                >
                                    {showCurrent ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="profile-new-password" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">New password</label>
                            <div className="relative">
                                <input
                                    id="profile-new-password"
                                    type={showNew ? 'text' : 'password'}
                                    className="input-field w-full pr-10"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowNew((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
                                    aria-label={showNew ? 'Hide password' : 'Show password'}
                                >
                                    {showNew ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex gap-0.5 flex-1 max-w-[120px]">
                                        <span
                                            className={`h-1.5 flex-1 rounded-full ${
                                                passwordStrength.level === 'weak' ? 'bg-red-500' : passwordStrength.level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                                            }`}
                                        />
                                        <span
                                            className={`h-1.5 flex-1 rounded-full ${
                                                passwordStrength.level === 'medium' || passwordStrength.level === 'strong' ? (passwordStrength.level === 'strong' ? 'bg-green-500' : 'bg-amber-500') : 'bg-[var(--border)]'
                                            }`}
                                        />
                                        <span className={`h-1.5 flex-1 rounded-full ${passwordStrength.level === 'strong' ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
                                    </div>
                                    <span
                                        className={`text-xs font-medium ${
                                            passwordStrength.level === 'weak'
                                                ? 'text-red-600'
                                                : passwordStrength.level === 'medium'
                                                ? 'text-amber-600'
                                                : 'text-green-600'
                                        }`}
                                    >
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-[var(--text-muted)] mt-1.5">At least 8 characters, 1 uppercase, 1 number, 1 special character.</p>
                        </div>
                        <div>
                            <label htmlFor="profile-confirm-password" className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Confirm new password</label>
                            <div className="relative">
                                <input
                                    id="profile-confirm-password"
                                    type={showConfirm ? 'text' : 'password'}
                                    className="input-field w-full pr-10"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirm ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-sm" role="alert">{error}</div>}
                        <div className="pt-1">
                            <button type="submit" disabled={loading || !passwordStrength.valid || newPassword !== confirmPassword} className="btn-primary inline-flex items-center justify-center gap-2 min-w-[140px]">
                                {loading && <span className="w-4 h-4 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin" aria-hidden />}
                                {loading ? 'Updating…' : 'Update password'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="text-center py-6">
                    <p className="text-xs text-[var(--text-subtle)]">BAC Documents Tracking System v2.0</p>
                </div>
            </div>

            {createPortal(confirmProfileContent, document.body)}
            {createPortal(confirmPasswordContent, document.body)}
        </div>
    );
};

export default Profile;
