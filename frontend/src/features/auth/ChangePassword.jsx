import React, { useState } from 'react';
import { userService } from '../../services/api';
import PasswordInput from '../../components/PasswordInput';
import { validatePassword, STRICT_PASSWORD_RULES } from '../../utils/auth';
import { MdLock } from 'react-icons/md';

const ChangePassword = ({ user, onPasswordChanged }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            setError(validation.errors);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New password and confirmation do not match.');
            return;
        }
        setLoading(true);
        try {
            await userService.changePassword(user.username, currentPassword, newPassword);
            onPasswordChanged();
        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to change password.';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'var(--page-bg-gradient)' }}
        >
            {/* Subtle dot grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, var(--page-dot) 1.5px, transparent 0)',
                    backgroundSize: '28px 28px',
                }}
            />

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className="card-elevated rounded-3xl overflow-hidden shadow-2xl border-0">
                    {/* Top accent bar */}
                    <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' }} />

                    <div className="p-8 sm:p-10">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-muted)] flex items-center justify-center mb-4 shadow-md shadow-[var(--primary-muted)]/30">
                                <MdLock className="w-8 h-8 text-[var(--primary)]" />
                            </div>
                            <h1 className="page-title">Set a New Password</h1>
                            <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                                You must set a new password before accessing the system.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="alert-error mb-6 rounded-xl" role="alert">
                                <div>
                                    {Array.isArray(error) ? (
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {error.map((msg, i) => (
                                                <li key={i}>{msg}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        error
                                    )}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                            <PasswordInput
                                id="current-password"
                                label="Current (temporary) password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                autoComplete="current-password"
                                variant="rounded"
                                required
                            />
                            <PasswordInput
                                id="new-password"
                                label="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                                variant="rounded"
                                showRequirementsChecklist={newPassword.length > 0}
                                rules={STRICT_PASSWORD_RULES}
                                required
                                minLength={8}
                            />
                            <PasswordInput
                                id="confirm-password"
                                label="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                                variant="rounded"
                                showToggle={false}
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full mt-2 py-3.5 text-sm font-bold"
                            >
                                {loading ? 'Updating…' : 'Set new password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.removeItem('user');
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('refreshToken');
                                    window.location.href = '/login';
                                }}
                                disabled={loading}
                                className="w-full py-3 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                                Sign out to try again
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
