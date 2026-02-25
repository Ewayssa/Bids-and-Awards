import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Encode from './pages/Encode';
import Reports from './pages/Reports';
import Personnel from './pages/User_management';
import Settings from './pages/Settings';
import Navigation from './components/Navigation';
import { canAccessRoute, mapOldRoleToNew, getDefaultRouteForRole, ROLES } from './utils/roles';

function AppContent() {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    const handleLogin = (userData) => {
        const role = mapOldRoleToNew(userData?.role) || ROLES.EMPLOYEE;
        setUser({ ...userData, role, must_change_password: userData?.must_change_password === true });
        navigate('/');
    };
    const handleLogout = () => setUser(null);
    const handlePasswordChanged = () => {
        setUser((prev) => (prev ? { ...prev, must_change_password: false } : null));
    };

    const userRole = user?.role || ROLES.EMPLOYEE;
    const defaultRoute = getDefaultRouteForRole(userRole);

    return (
        <>
            {!user ? (
                <Login onLogin={handleLogin} />
            ) : user.must_change_password ? (
                <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />
            ) : (
                <div className={`flex flex-nowrap min-h-screen w-full max-w-full bg-[var(--background)] overflow-x-hidden ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
                    <Navigation user={user} onLogout={handleLogout} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    <main className="flex-1 min-w-0 pt-14 md:pt-0 bg-[var(--background)] md:border-l border-[var(--border-light)] min-h-screen overflow-x-hidden" role="main">
                        <div className="page-container h-full w-full min-w-0 overflow-x-hidden">
                            <Routes>
                            <Route path="/" element={canAccessRoute(userRole, '/') ? <Dashboard user={user} sidebarOpen={true} onLogout={handleLogout} /> : <Navigate to={defaultRoute} replace />} />
                            <Route path="/encode" element={canAccessRoute(userRole, '/encode') ? <Encode user={user} /> : <Navigate to={defaultRoute} replace />} />
                            <Route path="/reports" element={canAccessRoute(userRole, '/reports') ? <Reports user={user} /> : <Navigate to={defaultRoute} replace />} />
                            <Route path="/personnel" element={canAccessRoute(userRole, '/personnel') ? <Personnel user={user} /> : <Navigate to={defaultRoute} replace />} />
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
