import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { MdClose } from 'react-icons/md';
import { mapOldRoleToNew, ROLES, validatePassword, STRICT_PASSWORD_RULES } from '../utils/auth';
import PasswordInput from '../components/PasswordInput';
import { userService } from '../services/api';

const LEFT_PANEL_IMAGE = '/dilg-logo.png';

const Login = ({ onLogin, infoMessage }) => {
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
    const [hasTriedLogin, setHasTriedLogin] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setHasTriedLogin(true);
        if (!email.trim()) {
            setError('Please enter your username or email.');
            return;
        }
        setLoading(true);
        try {
            const data = await userService.login(email, password);
            const role = mapOldRoleToNew(data.role);
            onLogin({
                username: data.username,
                role,
                fullName: data.fullName,
                position: data.position,
                office: data.office,
                must_change_password: data.must_change_password === true,
            });
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            let message = 'Login failed';
            if (!err.response) {
                if (err.code === 'ECONNREFUSED' || err.message?.includes('Network')) {
                    message = 'Connection failed. Make sure the backend is running.';
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
            await userService.requestPasswordReset(forgotIdentifier.trim());
            setForgotSuccess(true);
            setForgotError('Reset link or token was generated. In this development version, check the backend console for the token.');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to request reset.';
            setForgotError(Array.isArray(msg) ? msg : [msg]);
        } finally {
            setForgotLoading(false);
        }
    };

    const forgotModalContent = forgotOpen && (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
            aria-labelledby="forgot-password-title"
        >
            <div className="card-elevated w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl border-0 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
                    <h2 id="forgot-password-title" className="text-xl font-bold text-[var(--text)]">Reset password</h2>
                    <button
                        type="button"
                        onClick={closeForgotModal}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                {forgotSuccess ? (
                    <div className="p-6 text-center">
                        <div className="text-green-600 text-4xl mb-3">✓</div>
                        <p className="text-[var(--text)] font-medium">Password reset successfully. You can now log in.</p>
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
                            <label htmlFor="forgot-identifier" className="block text-sm font-medium text-[var(--text)] mb-1.5">Email or username</label>
                            <input
                                id="forgot-identifier"
                                type="text"
                                value={forgotIdentifier}
                                onChange={(e) => setForgotIdentifier(e.target.value)}
                                className="input-field w-full"
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
                        <p className="text-xs text-[var(--text-muted)]">The admin will be notified after you reset.</p>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={closeForgotModal}
                                className="btn-secondary"
                                disabled={forgotLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={forgotLoading}
                                className="btn-primary"
                            >
                                {forgotLoading ? 'Resetting…' : 'Reset password'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    const registerModalContent = registerOpen && (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/5 backdrop-blur-[4px] animate-in fade-in duration-300"
            aria-modal="true"
            role="dialog"
            aria-labelledby="register-title"
        >
            <div className="card-elevated w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl border-0 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
                    <h2 id="register-title" className="text-xl font-bold text-[var(--text)]">Create account</h2>
                    <button
                        type="button"
                        onClick={closeRegisterModal}
                        className="p-2 text-[var(--text-muted)] hover:bg-[var(--background-subtle)] rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {registerSuccess ? (
                        <div className="p-6 text-center">
                            <div className="text-green-600 text-4xl mb-3">✓</div>
                            <p className="text-[var(--text)] font-medium">Account created successfully.</p>
                            <p className="text-[var(--text-muted)] text-sm mt-2">You can log in once an administrator activates your account.</p>
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
                                <label htmlFor="register-username" className="block text-sm font-medium text-[var(--text)] mb-1.5">Username or email</label>
                                <input
                                    id="register-username"
                                    type="text"
                                    value={registerForm.username}
                                    onChange={(e) => setRegisterForm((f) => ({ ...f, username: e.target.value }))}
                                    className="input-field w-full"
                                    placeholder="Enter username or email"
                                    required
                                    disabled={registerLoading}
                                    autoComplete="username"
                                />
                            </div>
                            <div>
                                <label htmlFor="register-fullName" className="block text-sm font-medium text-[var(--text)] mb-1.5">Full name</label>
                                <input
                                    id="register-fullName"
                                    type="text"
                                    value={registerForm.fullName}
                                    onChange={(e) => setRegisterForm((f) => ({ ...f, fullName: e.target.value }))}
                                    className="input-field w-full"
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
                            <p className="text-xs text-[var(--text-muted)]">Your account must be activated by an administrator before you can log in.</p>
                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={closeRegisterModal}
                                    className="btn-secondary"
                                    disabled={registerLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={registerLoading}
                                    className="btn-primary"
                                >
                                    {registerLoading ? 'Creating…' : 'Create account'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="split-login-container bg-professional font-sans antialiased">
            {/* Branding Side - Visible on Desktop only */}
            <div className="login-branding-side">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                
                <div className="relative z-10 animate-entry">
                    <div className="flex items-center gap-6 mb-12">
                        <img
                            src={LEFT_PANEL_IMAGE}
                            alt="DILG Logo"
                            className="w-32 h-32 object-contain logo-glow"
                        />
                        <div className="space-y-1">
                            <p className="text-emerald-100/60 text-sm font-bold tracking-widest uppercase">
                                Republic of the Philippines
                            </p>
                            <p className="text-white text-xl font-bold leading-tight max-w-[280px]">
                                Department of the Interior and Local Government
                            </p>
                        </div>
                    </div>

                    <h1 className="branding-title">
                        Bids and <span className="text-gradient-emerald">Awards</span> <br /> 
                        Tracking System
                    </h1>
                    <p className="branding-subtitle italic font-serif">
                        "Matino, Mahusay at Maaasahan"
                    </p>
                    <div className="mt-12 h-1 w-20 bg-emerald-500 rounded-full" />
                </div>
            </div>

            {/* Form Side */}
            <div className="login-form-side">
                <div 
                    className={`w-full max-w-md rounded-3xl glass-card p-8 sm:p-10 animate-entry ${isFocused ? 'glass-card-glow' : ''}`}
                    style={{ animationDelay: '200ms' }}
                >
                    {/* Compact Header for Form Side (Mobile Logo) */}
                    <div className="flex flex-col items-center lg:items-start mb-8">
                        <div className="lg:hidden flex items-center gap-4 mb-6">
                            <img
                                src={LEFT_PANEL_IMAGE}
                                alt=""
                                className="w-20 h-20 object-contain animate-entry logo-glow"
                            />
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                                    Republic of the Philippines
                                </p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight max-w-[150px]">
                                    Department of the Interior and Local Government
                                </p>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    {/* Messages Area */}
                    <div 
                        className="transition-all duration-300 overflow-hidden"
                        style={{ height: (error || (!error && infoMessage && !hasTriedLogin)) ? 'auto' : '0', marginBottom: (error || (!error && infoMessage && !hasTriedLogin)) ? '1.5rem' : '0' }}
                    >
                        {error && (
                            <div className="bg-red-50 border border-red-200/80 text-red-800 text-sm px-4 py-3 rounded-xl shadow-sm animate-fade-in" role="alert">
                                {error}
                            </div>
                        )}
                        {!error && infoMessage && !hasTriedLogin && (
                            <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-sm px-4 py-3 rounded-xl shadow-sm animate-fade-in" role="status">
                                {infoMessage}
                            </div>
                        )}
                    </div>

                    <form 
                        onSubmit={handleSubmit} 
                        className="space-y-6"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    >
                        <div className="space-y-5">
                            <div className="floating-label-group rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/40 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                                <input
                                    id="login-email"
                                    type="text"
                                    className="w-full px-5 py-4 bg-transparent text-slate-900 dark:text-white placeholder-transparent outline-none border-0 focus:ring-0 text-[15px] rounded-2xl floating-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="username"
                                    required
                                    placeholder=" "
                                />
                                <label htmlFor="login-email" className="floating-label">
                                    Username or email
                                </label>
                            </div>
                            <PasswordInput
                                id="login-password"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                                variant="rounded"
                                floating={true}
                                className="rounded-2xl"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 rounded-2xl text-lg font-bold btn-magnetic shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign in'}
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-sm">
                            <button
                                type="button"
                                onClick={openRegisterModal}
                                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors flex items-center gap-1.5"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Create account
                            </button>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden>·</span>
                            <button
                                type="button"
                                onClick={openForgotModal}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                    
                </div>
            </div>

            {createPortal(forgotModalContent, document.body)}
            {createPortal(registerModalContent, document.body)}
        </div>
    );
};

export default Login;
