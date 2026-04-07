import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import SetupPageNew from './pages/SetupPageNew';
import InterviewPageNew from './pages/InterviewPageNew';
import ResultsPage from './pages/ResultsPage';
import DashboardPage from './pages/DashboardPage';
import ThemeSettingsPage from './pages/ThemeSettingsPage';
import CompaniesPage from './pages/CompaniesPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/auth" />;
};

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const initials = useMemo(() => {
    if (!user) return 'U';
    const source = user.name || user.email || 'User';
    return source.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/auth');
  };

  return (
    <div className="profile-menu">
      <button type="button" className="profile-menu__trigger" onClick={() => setIsOpen((v) => !v)} aria-label="Open profile menu" aria-expanded={isOpen}>
        <span className="profile-menu__avatar">{initials}</span>
      </button>
      {isOpen && (
        <div className="profile-menu__dropdown">
          <div className="profile-menu__info">
            <span className="profile-menu__name">{user.name || 'User'}</span>
            <span className="profile-menu__email">{user.email}</span>
          </div>
          <Link className="profile-menu__item" to="/theme-settings" onClick={() => setIsOpen(false)}>Theme Settings</Link>
          <button type="button" className="profile-menu__item profile-menu__item--danger" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute><CompaniesPage /></ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute><SetupPageNew /></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><InterviewPageNew /></ProtectedRoute>} />
      <Route path="/results/:id" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/theme-settings" element={<ProtectedRoute><ThemeSettingsPage /></ProtectedRoute>} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const hideControls = location.pathname === '/interview';
  return (
    <div className="app-shell">
      {!hideControls && (
        <div className="app-shell__controls">
          <ProfileMenu />
        </div>
      )}
      <AppRoutes />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
