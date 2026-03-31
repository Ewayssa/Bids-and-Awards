import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Encode from './pages/Encode';
import Reports from './pages/ReportsPage';
import Personnel from './pages/UserManagement';
import Settings from './pages/Settings';
import AuditTrail from './pages/AuditTrail';
import Navigation from './layouts/Navigation';
import { canAccessRoute, mapOldRoleToNew, getDefaultRouteForRole, ROLES } from './utils/auth';

const SESSION_TIMEOUT_MINUTES = 5;

function AppContent() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loginInfoMessage, setLoginInfoMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = (userData) => {
        const role = mapOldRoleToNew(userData?.role) || ROLES.USER;
        setUser({ ...userData, role, must_change_password: userData?.must_change_password === true });
        setLoginInfoMessage('');
        navigate('/');
    };
    const handleLogout = () => {
        setUser(null);
        setLoginInfoMessage('');
    };
    const handlePasswordChanged = () => {
        setUser((prev) => (prev ? { ...prev, must_change_password: false } : null));
    };

    // Session timeout based on user inactivity
    useEffect(() => {
        if (!user) return;

        const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
        let timeoutId;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setUser(null);
                setLoginInfoMessage('Your session has ended due to inactivity. Please sign in again.');
                navigate('/');
            }, timeoutMs);
        };

        const events = ['click', 'mousemove', 'keydown', 'scroll', 'focus'];
        events.forEach((evt) => window.addEventListener(evt, resetTimer));
        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, [user, navigate]);

    const userRole = user?.role || ROLES.USER;
    const defaultRoute = getDefaultRouteForRole(userRole);

    return (
        <>
            {!user ? (
                <Login onLogin={handleLogin} infoMessage={loginInfoMessage} />
            ) : user.must_change_password ? (
                <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />
            ) : (
                <div className={`flex flex-nowrap min-h-screen w-full max-w-full bg-[var(--background)] overflow-x-hidden ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
                    <Navigation user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    <main className="flex-1 min-w-0 pt-14 md:pt-0 bg-[var(--background)] md:border-l border-[var(--border-light)] min-h-screen overflow-x-hidden" role="main">
                        <div className="page-container h-full w-full min-w-0 overflow-x-hidden">
                            <Routes>
                                <Route path="/" element={canAccessRoute(userRole, '/') ? <Dashboard user={user} sidebarOpen={true} onLogout={handleLogout} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="/encode" element={canAccessRoute(userRole, '/encode') ? <Encode user={user} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="/reports" element={canAccessRoute(userRole, '/reports') ? <Reports user={user} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="/personnel" element={canAccessRoute(userRole, '/personnel') ? <Personnel user={user} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="/audit-trail" element={canAccessRoute(userRole, '/audit-trail') ? <AuditTrail user={user} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="/settings" element={canAccessRoute(userRole, '/settings') ? <Settings user={user} /> : <Navigate to={defaultRoute} replace />} />
                                <Route path="*" element={<Navigate to={defaultRoute} replace />} />
                            </Routes>
                        </div>
                    </main>
                </div>
            )}
        </>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
