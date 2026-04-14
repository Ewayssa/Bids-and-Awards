import React, { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/api';
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
    MdCheckCircle,
    MdInfo,
} from 'react-icons/md';
import { getRoleDisplayName, ROLES } from '../../utils/auth';
import Modal from '../../components/Modal';

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

    return (
        <div className="space-y-8 pb-10 max-w-4xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                        Account Protocol
                    </h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Identity & Security Management</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">System Active</span>
                </div>
            </header>

            {/* Toast notifications */}
            {toast && (
                <div
                    role="alert"
                    className={`fixed bottom-8 right-8 z-[200] px-5 py-3.5 rounded-xl shadow-[var(--shadow-lg)] border flex items-center gap-3 animate-in slide-in-from-right duration-500 ${
                        toast.type === 'error'
                            ? 'bg-white dark:bg-slate-900 border-red-500 text-red-600'
                            : 'bg-white dark:bg-slate-900 border-emerald-500 text-emerald-600'
                    }`}
                >
                    {toast.type === 'error' ? <MdLock className="w-6 h-6" /> : <MdCheckCircle className="w-6 h-6" />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* My Account Section */}
                <div className="lg:col-span-12">
                    <div className="content-section overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] transition-shadow hover:shadow-[var(--shadow-lg)]">
                        <div className="p-8 sm:p-10 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--background-subtle)]/40">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[var(--primary)] rounded-xl text-[var(--primary-foreground)] shadow-sm">
                                    <MdPerson className="w-6 h-6" aria-hidden />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Profile</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personal credentials</p>
                                </div>
                            </div>
                            {!editingProfile ? (
                                <button
                                    type="button"
                                    onClick={() => setEditingProfile(true)}
                                    className="btn-secondary inline-flex items-center gap-2"
                                >
                                    <MdEdit className="w-4 h-4" /> Edit profile
                                </button>
                            ) : (
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
                            )}
                        </div>

                        <div className="p-8 sm:p-10">
                            {!editingProfile ? (
                                <div className="flex flex-col md:flex-row gap-12">
                                    <div className="relative group/avatar shrink-0 mx-auto md:mx-0">
                                        <div className="w-40 h-40 rounded-[2rem] bg-[var(--background-subtle)] flex items-center justify-center overflow-hidden border-4 border-[var(--surface)] shadow-md text-4xl font-bold text-[var(--primary)]">
                                            {profilePhoto ? (
                                                <img src={profilePhoto} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/avatar:scale-110" />
                                            ) : (
                                                getInitials(fullName, user?.username)
                                            )}
                                        </div>
                                        <label className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-[var(--primary)]/85 opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                                            <MdCameraAlt className="w-10 h-10 text-white" />
                                            <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} aria-label="Upload profile photo" />
                                        </label>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
                                        <ProfileInfoRow icon={<MdBadge />} label="Full Identity" value={fullName} />
                                        <ProfileInfoRow icon={<MdEmail />} label="Digital Address" value={user?.username} />
                                        <ProfileInfoRow icon={<MdWork />} label="Designated Position" value={position} />
                                        <ProfileInfoRow icon={<MdBusiness />} label="Assigned Department" value={office} />
                                        <div className="md:col-span-2 pt-4">
                                            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                                                <MdLock className="w-4 h-4 text-emerald-600" />
                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">Authorized as {roleDisplay}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleProfileSubmit} className="max-w-3xl space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <ProfileInput icon={<MdPerson />} label="Full Name" id="profile-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter formal name" />
                                        <ProfileInput icon={<MdEmail />} label="Email Address" id="profile-email" value={user?.username} disabled={true} />
                                        <ProfileInput icon={<MdWork />} label="Position" id="profile-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Administrator" disabled={!isAdmin} />
                                        <ProfileInput icon={<MdBusiness />} label="Department" id="profile-office" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="e.g. Operations" disabled={!isAdmin} />
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100">Identity verification</label>
                                            <div className="relative">
                                                <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="password"
                                                    value={profilePassword}
                                                    onChange={(e) => setProfilePassword(e.target.value)}
                                                    placeholder="Enter password to authorize changes"
                                                    className="input-field w-full pl-12 pr-4"
                                                    required
                                                />
                                            </div>
                                            {profileError && <p className="text-[10px] font-black text-red-500 uppercase px-1 mt-2">{profileError}</p>}
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button type="submit" disabled={profileLoading} className="btn-primary btn-lg inline-flex items-center gap-3">
                                            {profileLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdCheckCircle className="w-5 h-5" />}
                                            Save Profile Update
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>

                {/* Password Section */}
                <div className="lg:col-span-12">
                    <div className="content-section overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]">
                        <div className="p-8 sm:p-10 border-b border-[var(--border-light)] flex items-center gap-4 bg-[var(--background-subtle)]/40">
                            <div className="p-3 bg-[var(--destructive)] rounded-xl text-[var(--destructive-foreground)] shadow-sm">
                                <MdLock className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Security Access</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Update credentials</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-8 sm:p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Current Password</label>
                                    <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">New Password</label>
                                        <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} show={showNew} onToggle={() => setShowNew(!showNew)} />
                                    </div>
                                    {newPassword && (
                                        <div className="px-1 space-y-1.5">
                                            <div className="flex gap-1 h-1">
                                                <div className={`flex-1 rounded-full ${passwordStrength.level === 'weak' ? 'bg-red-500' : passwordStrength.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                <div className={`flex-1 rounded-full ${passwordStrength.level === 'medium' || passwordStrength.level === 'strong' ? (passwordStrength.level === 'strong' ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-100 dark:bg-slate-800'}`} />
                                                <div className={`flex-1 rounded-full ${passwordStrength.level === 'strong' ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
                                            </div>
                                            <p className={`text-[10px] font-black uppercase tracking-tight ${passwordStrength.level === 'weak' ? 'text-red-500' : passwordStrength.level === 'medium' ? 'text-amber-600' : 'text-emerald-500'}`}>
                                                Strength: {passwordStrength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Final Validation</label>
                                    <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Re-enter new password" />
                                </div>
                                
                                <div className="md:col-start-1 md:col-span-2 bg-[var(--background-subtle)]/80 p-6 rounded-xl border border-[var(--border-light)]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <MdInfo className="w-4 h-4" /> Standard Operating Requirement
                                    </p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
                                        Entropy minimum: 8+ characters, alpha-numeric with signature character and shift-case variety.
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 flex items-center gap-3">
                                    <MdInfo className="w-5 h-5" />
                                    <p className="text-[10px] font-black uppercase tracking-tight">{error}</p>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || !passwordStrength.valid || newPassword !== confirmPassword}
                                    className="btn-primary btn-lg inline-flex items-center gap-3 disabled:opacity-30"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MdLock className="w-5 h-5" />}
                                    Authorize Access Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="lg:col-span-12 text-center py-10 opacity-30">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">BAC Documents Tracking System • Registry Phase 2.0</p>
                </div>
            </div>

            {/* Confirmation Modals using standard Modal component */}
            <Modal
                isOpen={showConfirmProfile}
                onClose={() => setShowConfirmProfile(false)}
                title="Protocol Confirmation"
                size="md"
            >
                <div className="p-2 space-y-6">
                    <div className="alert-info">
                        <MdCheckCircle className="w-8 h-8 shrink-0 text-[var(--primary)]" aria-hidden />
                        <div>
                            <p className="text-xs font-semibold m-0 mb-1">Confirm update</p>
                            <p className="text-sm font-medium m-0">Save revised account details?</p>
                        </div>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setShowConfirmProfile(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button type="button" onClick={confirmProfileSubmit} className="btn-primary flex-1 justify-center">Save changes</button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showConfirmPassword}
                onClose={() => setShowConfirmPassword(false)}
                title="Security Breach Prevention"
                size="md"
            >
                <div className="p-2 space-y-6">
                    <div className="alert-error">
                        <MdLock className="w-8 h-8 shrink-0" aria-hidden />
                        <div>
                            <p className="text-sm font-semibold m-0 mb-1">Password change</p>
                            <p className="text-sm font-medium m-0">You may need to sign in again after updating your password.</p>
                        </div>
                    </div>
                    <div className="modal-footer !p-0 !border-0 flex gap-3">
                        <button type="button" onClick={() => setShowConfirmPassword(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button type="button" onClick={confirmPasswordSubmit} className="btn-primary flex-1 justify-center">Save update</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

/* Internal UI primitives */
const ProfileInfoRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-4 p-5 bg-[var(--background-subtle)]/80 rounded-xl border border-[var(--border-light)] hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] transition-colors">
        <div className="mt-1 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-slate-400">
            {React.cloneElement(icon, { className: 'w-5 h-5' })}
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{value || '—'}</p>
        </div>
    </div>
);

const ProfileInput = ({ icon, label, id, value, onChange, placeholder, disabled = false }) => (
    <div className="field-group">
        <label htmlFor={id} className="label !normal-case !tracking-normal !text-xs !font-semibold !opacity-100">{label}</label>
        <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
                {React.cloneElement(icon, { className: 'w-5 h-5' })}
            </div>
            <input
                id={id}
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`input-field w-full pl-11 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    </div>
);

const PasswordInput = ({ value, onChange, show, onToggle, placeholder = "Enter password" }) => (
    <div className="relative">
        <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
            type={show ? 'text' : 'password'}
            className="input-field w-full pl-11 pr-11"
            value={value}
            onChange={onChange}
            required
            placeholder={placeholder}
        />
        <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--background-subtle)] transition-colors"
        >
            {show ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
        </button>
    </div>
);

export default Profile;
