import React, { useState } from 'react';
import { userService } from '../services/api';
import PasswordInput from '../components/PasswordInput';

const ChangePassword = ({ user, onPasswordChanged }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
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
            style={{
                backgroundImage: 'linear-gradient(135deg, #f97316 0%, #ea580c 35%, #dc2626 65%, #b91c1c 100%), repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.03) 12px, rgba(255,255,255,0.03) 24px)',
            }}
        >
            <div className="w-full max-w-md min-w-0 rounded-2xl overflow-hidden shadow-2xl bg-white p-6 sm:p-8">
                <h1 className="text-2xl font-bold text-gray-900">Change your password</h1>
                <p className="text-sm text-gray-500 mt-1">
                    You must set a new password before you can access the system.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg mt-4" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col space-y-5">
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
                        showRequirementsChecklist
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
                        className="w-full mt-2 py-3.5 rounded-xl font-semibold text-white text-center text-sm uppercase tracking-wide disabled:opacity-70 hover:opacity-95 transition-opacity"
                        style={{
                            background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.45)',
                        }}
                    >
                        {loading ? 'Updating…' : 'Set new password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
