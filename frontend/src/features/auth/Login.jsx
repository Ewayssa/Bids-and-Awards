import React, { useState } from 'react';
import axios from 'axios';
import { MdClose, MdCheck } from 'react-icons/md';
import { mapOldRoleToNew, ROLES, validatePassword, STRICT_PASSWORD_RULES } from '../../utils/auth';
import PasswordInput from '../../components/PasswordInput';
import Modal from '../../components/Modal';
import { userService } from '../../services/api';

const LEFT_PANEL_IMAGE = '/dilg-logo.png';
const BAGONG_PILIPINAS_LOGO = '/bagong-pilipinas-logo.png';

const Login = ({ onLogin, infoMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotOpen, setForgotOpen] = useState(false);
    const [forgotIdentifier, setForgotIdentifier] = useState('');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [tempPassword, setTempPassword] = useState('');
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
            const role = mapOldRoleToNew(data.role, data.position);
            onLogin({
                username: data.username,
                role,
                fullName: data.fullName,
                position: data.position || '',
                office: data.office || '',
                is_bac_secretariat: !!data.is_bac_secretariat,
                is_bac_chair: !!data.is_bac_chair,
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
        setForgotError('');
        setForgotSuccess(false);
        setTempPassword('');
    };

    const closeForgotModal = () => {
        setForgotOpen(false);
        setForgotError('');
        setForgotLoading(false);
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        if (!forgotIdentifier.trim()) {
            setForgotError('Please enter your email or username.');
            return;
        }
        setForgotLoading(true);
        try {
            const res = await userService.requestPasswordReset(forgotIdentifier.trim());
            setForgotSuccess(true);
            if (res.temporary_password) {
                setTempPassword(res.temporary_password);
            }
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to request temporary password.';
            setForgotError(Array.isArray(msg) ? msg : [msg]);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="split-login-container bg-professional font-sans antialiased">
            {/* Branding Side - Visible on Desktop only */}
            <div className="login-branding-side">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                
                <div className="relative z-10 animate-entry">
                    <div className="flex items-center gap-6 mb-12">
                        <div className="flex items-center gap-0">
                            <img
                                src={LEFT_PANEL_IMAGE}
                                alt="DILG Logo"
                                className="w-24 h-24 object-contain logo-glow"
                            />
                            <img
                                src={BAGONG_PILIPINAS_LOGO}
                                alt="Bagong Pilipinas Logo"
                                className="w-24 h-24 object-contain logo-glow"
                            />
                        </div>
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
                        Tracking Management System
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
                            <div className="flex items-center gap-0">
                                <img
                                    src={LEFT_PANEL_IMAGE}
                                    alt=""
                                    className="w-14 h-14 object-contain animate-entry logo-glow"
                                />
                                <img
                                    src={BAGONG_PILIPINAS_LOGO}
                                    alt=""
                                    className="w-14 h-14 object-contain animate-entry logo-glow"
                                />
                            </div>
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
                        style={{ maxHeight: (error || (!error && infoMessage && !hasTriedLogin)) ? '500px' : '0', marginBottom: (error || (!error && infoMessage && !hasTriedLogin)) ? '1.5rem' : '0', opacity: (error || (!error && infoMessage && !hasTriedLogin)) ? '1' : '0' }}
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
                                onClick={openForgotModal}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Standardized Modals */}
            <Modal
                isOpen={forgotOpen}
                onClose={closeForgotModal}
                title="Reset Password"
                size="md"
            >
                {forgotSuccess ? (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center animate-bounce">
                                <div className="text-emerald-600 dark:text-emerald-400 text-3xl font-bold">✓</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Request Successful</h3>
                            <p className="text-[var(--text-muted)]">A temporary password has been generated for your account.</p>
                        </div>
                        
                        {tempPassword && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 group">
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold mb-1">Your Temporary Password</p>
                                <div className="flex items-center justify-center gap-2">
                                    <code className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
                                        {tempPassword}
                                    </code>
                                </div>
                                <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-2">
                                    Please use this to log in. You will be prompted to set a new password immediately.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={closeForgotModal}
                            className="btn-primary w-full py-3 rounded-xl"
                        >
                            Back to Sign In
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                                Provide your username or email and we'll generate a temporary password for you to regain access.
                            </p>
                        </div>

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

                        <div className="floating-label-group rounded-2xl border border-slate-200 bg-white/50 dark:bg-slate-800/40 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                            <input
                                id="forgot-identifier"
                                type="text"
                                className="w-full px-5 py-4 bg-transparent text-slate-900 dark:text-white placeholder-transparent outline-none border-0 focus:ring-0 text-[15px] rounded-2xl floating-input"
                                value={forgotIdentifier}
                                onChange={(e) => setForgotIdentifier(e.target.value)}
                                placeholder=" "
                                required
                                disabled={forgotLoading}
                                autoComplete="username"
                            />
                            <label htmlFor="forgot-identifier" className="floating-label">
                                Username or email
                            </label>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={closeForgotModal}
                                className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                disabled={forgotLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={forgotLoading}
                                className="btn-primary px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20"
                            >
                                {forgotLoading ? 'Processing…' : 'Generate Password'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default Login;
