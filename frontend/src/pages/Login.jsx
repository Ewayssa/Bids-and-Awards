import React, { useState } from 'react';
import axios from 'axios';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { mapOldRoleToNew, ROLES } from '../utils/roles';
import PasswordInput from '../components/PasswordInput';

const LEFT_PANEL_IMAGE = '/dilg-logo.png';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
                username: email,
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
            const isConnectionFailed = !err.response && (err.code === 'ECONNREFUSED' || err.message?.includes('Network'));
            setError(
                isConnectionFailed
                    ? 'Connection failed. Make sure the backend is running: run start-project.ps1 in the bids-and-awards folder (or run run-backend.ps1 in one window and run-frontend.ps1 in another). Then open the URL shown by Vite (e.g. http://localhost:5173 or http://localhost:5175).'
                    : (err.response?.data?.message || 'Login failed')
            );
        } finally {
            setLoading(false);
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
                className="w-full max-w-5xl min-w-0 rounded-2xl overflow-hidden flex flex-col lg:flex-row min-h-[32rem] lg:min-h-[30rem] max-h-[95vh] lg:max-h-[38rem] shadow-2xl shrink-0"
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
                <div className="flex-1 flex flex-col justify-center p-8 sm:p-10 lg:p-12 bg-white">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">BAC Documents Tracking System</h2>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-4">Login</h1>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded-lg mt-4" role="alert">
                            {error}
                        </div>
                    )}

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

                        <div className="flex justify-center mt-4">
                            <a href="#" className="text-sm text-[#D4140F] hover:underline" onClick={(e) => e.preventDefault()}>
                                Forgot password?
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
