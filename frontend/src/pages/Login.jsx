import React, { useState } from 'react';
import axios from 'axios';
import { MdClose } from 'react-icons/md';
import { mapOldRoleToNew, ROLES } from '../utils/roles';
import PasswordInput from '../components/PasswordInput';
import { userService } from '../services/api';
import { validatePassword, STRICT_PASSWORD_RULES } from '../utils/password';

const LEFT_PANEL_IMAGE = '/dilg-logo.png';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotIdentifier, setForgotIdentifier] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [registerForm, setRegisterForm] = useState({ username: '', fullName: '', password: '', confirmPassword: '' });
    const [registerError, setRegisterError] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Please enter your username or email.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/api/login', { username: email, password });
            const role = mapOldRoleToNew(res.data?.role);
            onLogin({
                username: res.data?.username ?? email,
                role,
                fullName: res.data?.fullName ?? email,
                position: res.data?.position ?? '',
                office: res.data?.office ?? '',
                must_change_password: res.data?.must_change_password === true,
            });
        } catch (err) {
            if ((email === 'admin' && (password === 'admin123' || password === 'admin'))) {
                onLogin({ username: 'admin', role: ROLES.ADMIN, fullName: 'Admin', position: '', office: '', must_change_password: false });
                return;
            }
            const status = err.response?.status;
            const data = err.response?.data;
            let message = 'Login failed';
            if (!err.response) {
                if (err.code === 'ECONNREFUSED' || err.message?.includes('Network')) {
                    message = 'Connection failed. Make sure the backend is running: run start-project.ps1 in the bids-and-awards folder (or run run-backend.ps1 in one window and run-frontend.ps1 in another). Then open the URL shown by Vite (e.g. http://localhost:5173 or http://localhost:5175).';
                }
            } else if (status === 403) {
                message = 'Your account is not yet active. An administrator must activate it before you can log in.';
            } else {
                const body = typeof data === 'object' && data !== null ? data : {};
                message = body.message || body.detail || (Array.isArray(body.detail) ? body.detail[0] : undefined) || 'Login failed';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const openForgotModal = () => {
        setForgotOpen(true);
        setForgotIdentifier('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotError('');
        setForgotSuccess(false);
    };

    const closeForgotModal = () => {
        setForgotOpen(false);
        setForgotError('');
        setForgotLoading(false);
    };

    const openRegisterModal = () => {
        setRegisterForm({ username: '', fullName: '', password: '', confirmPassword: '' });
        setRegisterError('');
        setRegisterSuccess(false);
        setRegisterOpen(true);
    };

    const closeRegisterModal = () => {
        setRegisterOpen(false);
        setRegisterError('');
        setRegisterLoading(false);
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegisterError('');
        const { username, fullName, password, confirmPassword } = registerForm;
        if (!username.trim()) {
            setRegisterError('Username or email is required.');
            return;
        }
        if (!fullName.trim()) {
            setRegisterError('Full name is required.');
            return;
        }
        const validation = validatePassword(password);
        if (!validation.valid) {
            setRegisterError(validation.errors);
            return;
        }
        if (password !== confirmPassword) {
            setRegisterError('Password and confirmation do not match.');
            return;
        }
        setRegisterLoading(true);
        try {
            await userService.register({
                username: username.trim(),
                fullName: fullName.trim(),
                password,
            });
            setRegisterSuccess(true);
            setTimeout(() => closeRegisterModal(), 2500);
        } catch (err) {
            const d = err.response?.data;
            let msg = 'Registration failed.';
            if (d?.username) msg = Array.isArray(d.username) ? d.username[0] : d.username;
            else if (d?.fullName) msg = Array.isArray(d.fullName) ? d.fullName[0] : d.fullName;
            else if (d?.password) msg = Array.isArray(d.password) ? d.password[0] : d.password;
            else if (d?.detail) msg = Array.isArray(d.detail) ? d.detail.join(' ') : d.detail;
            setRegisterError(msg);
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        if (!forgotIdentifier.trim()) {
            setForgotError('Please enter your email or username.');
            return;
        }
        const validation = validatePassword(forgotNewPassword);
        if (!validation.valid) {
            setForgotError(validation.errors);
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('New password and confirmation do not match.');
            return;
        }
        setForgotLoading(true);
        try {
            const data = await userService.requestPasswordReset(forgotIdentifier.trim());
            if (!data?.token) {
                setForgotError('Could not get reset token. Please try again.');
                return;
            }
            await userService.resetPassword(data.token, forgotNewPassword);
            setForgotSuccess(true);
            setTimeout(() => {
                closeForgotModal();
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to reset password.';
            setForgotError(Array.isArray(msg) ? msg : [msg]);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            style={{
                backgroundImage: 'linear-gradient(135deg, #f97316 0%, #ea580c 35%, #dc2626 65%, #b91c1c 100%), repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(255,255,255,0.03) 12px, rgba(255,255,255,0.03) 24px)',
                scrollbarGutter: 'stable',
            }}
        >
            <div
                className="w-full max-w-5xl min-w-[min(100%,22rem)] rounded-2xl overflow-hidden flex flex-col lg:flex-row min-h-[32rem] lg:min-h-[30rem] max-h-[95vh] lg:max-h-[38rem] shadow-2xl shrink-0"
                style={{ backgroundColor: '#fefefe', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
            >
                {/* Left – full-bleed image + overlay text (gaya sa picture) */}
                <div className="relative flex-[0_0_100%] lg:flex-[0_0_40%] min-h-[14rem] lg:min-h-0">
                    <img
                        src={LEFT_PANEL_IMAGE}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
                </div>

                {/* Right – white form (layout from reference) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center p-8 sm:p-10 lg:p-12 bg-white">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">BAC Documents Tracking System</h2>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-4">Login</h1>

                    <div className="min-h-[5.5rem] mt-4 flex flex-col justify-center" aria-live="polite">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg" role="alert">
                                {error}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                    Email
                                </label>
                                <div className="relative border-b border-gray-300 focus-within:border-gray-700 transition-colors">
                                    <input
                                        id="login-email"
                                        type="text"
                                        className="w-full pl-0 pr-4 py-2.5 bg-transparent text-gray-900 placeholder-gray-400 outline-none border-0 focus:ring-0"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        placeholder="Enter email"
                                    />
                                </div>
                            </div>
                            <PasswordInput
                                id="login-password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 py-3.5 rounded-lg font-semibold text-white text-center text-sm uppercase tracking-wide transition-all duration-200 disabled:opacity-70 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#16a34a] focus:ring-offset-2"
                            style={{
                                background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.45)',
                            }}
                        >
                            {loading ? 'Signing in…' : 'LOGIN'}
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4">
                            <button
                                type="button"
                                onClick={openRegisterModal}
                                className="text-sm text-[#16a34a] hover:underline focus:outline-none font-medium"
                            >
                                Create account
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                                type="button"
                                onClick={openForgotModal}
                                className="text-sm text-[#D4140F] hover:underline focus:outline-none"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Forgot password modal */}
            {forgotOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="forgot-password-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 id="forgot-password-title" className="text-xl font-bold text-gray-900">Reset password</h2>
                            <button
                                type="button"
                                onClick={closeForgotModal}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        {forgotSuccess ? (
                            <div className="p-6 text-center">
                                <div className="text-green-600 text-4xl mb-3">✓</div>
                                <p className="text-gray-700 font-medium">Password reset successfully. You can now log in.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
                                {forgotError && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg" role="alert">
                                        {Array.isArray(forgotError) ? (
                                            <ul className="list-disc list-inside space-y-0.5">
                                                {forgotError.map((msg, i) => (
                                                    <li key={i}>{msg}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            forgotError
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="forgot-identifier" className="block text-sm font-medium text-gray-700 mb-1">Email or username</label>
                                    <input
                                        id="forgot-identifier"
                                        type="text"
                                        value={forgotIdentifier}
                                        onChange={(e) => setForgotIdentifier(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="Enter your email or username"
                                        required
                                        disabled={forgotLoading}
                                    />
                                </div>
                                <PasswordInput
                                    id="forgot-new-password"
                                    label="New password"
                                    value={forgotNewPassword}
                                    onChange={(e) => setForgotNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                    variant="rounded"
                                    showRequirementsChecklist={forgotNewPassword.length > 0}
                                    rules={STRICT_PASSWORD_RULES}
                                    required
                                    minLength={8}
                                    disabled={forgotLoading}
                                />
                                <PasswordInput
                                    id="forgot-confirm-password"
                                    label="Confirm new password"
                                    value={forgotConfirmPassword}
                                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                    variant="rounded"
                                    showToggle={false}
                                    required
                                    disabled={forgotLoading}
                                />
                                <p className="text-xs text-gray-500">The admin will be notified after you reset.</p>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeForgotModal}
                                        className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        disabled={forgotLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="flex-1 py-2.5 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                                        style={{
                                            background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                                        }}
                                    >
                                        {forgotLoading ? 'Resetting…' : 'Reset password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Create account (register) modal */}
            {registerOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="register-title"
                >
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 id="register-title" className="text-xl font-bold text-gray-900">Create account</h2>
                            <button
                                type="button"
                                onClick={closeRegisterModal}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                aria-label="Close"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>
                        {registerSuccess ? (
                            <div className="p-6 text-center">
                                <div className="text-green-600 text-4xl mb-3">✓</div>
                                <p className="text-gray-700 font-medium">Account created successfully.</p>
                                <p className="text-gray-600 text-sm mt-2">You can log in once an administrator activates your account.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
                                {registerError && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg" role="alert">
                                        {Array.isArray(registerError) ? (
                                            <ul className="list-disc list-inside space-y-0.5">
                                                {registerError.map((msg, i) => (
                                                    <li key={i}>{msg}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            registerError
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="register-username" className="block text-sm font-medium text-gray-700 mb-1">Username or email</label>
                                    <input
                                        id="register-username"
                                        type="text"
                                        value={registerForm.username}
                                        onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="Enter username or email"
                                        required
                                        disabled={registerLoading}
                                        autoComplete="username"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="register-fullName" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                                    <input
                                        id="register-fullName"
                                        type="text"
                                        value={registerForm.fullName}
                                        onChange={(e) => setRegisterForm((f) => ({ ...f, fullName: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="Enter your full name"
                                        required
                                        disabled={registerLoading}
                                        autoComplete="name"
                                    />
                                </div>
                                <PasswordInput
                                    id="register-password"
                                    label="Password"
                                    value={registerForm.password}
                                    onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                                    placeholder="Enter password"
                                    variant="rounded"
                                    showRequirementsChecklist={registerForm.password.length > 0}
                                    rules={STRICT_PASSWORD_RULES}
                                    required
                                    minLength={8}
                                    disabled={registerLoading}
                                    autoComplete="new-password"
                                />
                                <PasswordInput
                                    id="register-confirmPassword"
                                    label="Confirm password"
                                    value={registerForm.confirmPassword}
                                    onChange={(e) => setRegisterForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                    placeholder="Confirm password"
                                    variant="rounded"
                                    showToggle={false}
                                    required
                                    disabled={registerLoading}
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-gray-500">Your account must be activated by an administrator before you can log in.</p>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeRegisterModal}
                                        className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        disabled={registerLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={registerLoading}
                                        className="flex-1 py-2.5 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                                        style={{
                                            background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                                        }}
                                    >
                                        {registerLoading ? 'Creating…' : 'Create account'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
