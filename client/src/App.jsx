import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AuthPage } from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Reports from './pages/Reports.jsx';
import { useAuth } from './auth.jsx';
import { useRemote } from './hooks.js';
import { Brand } from './components/Brand.jsx';
import { ErrorMessage, Spinner, Toast } from './components/UI.jsx';
import { ReadingDialog, DeleteDialog } from './components/ReadingActions.jsx';
import { formatDate } from '../../shared/dates.js';

function Protected() {
  const { user, loading, error } = useAuth();
  if (loading)
    return (
      <div className="app-loading">
        <Brand />
        <Spinner label="Restoring your session" />
        <p>Getting things ready…</p>
      </div>
    );
  if (error)
    return (
      <div className="app-loading">
        <Brand />
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [metaVersion, setMetaVersion] = useState(0);
  const meta = useRemote('/meta', metaVersion, true);
  const [date, setDate] = useState(null);
  const previousToday = useRef(null);
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const closeToast = useCallback(() => setToast(''), []);
  useEffect(() => {
    if (meta.data?.today) {
      const oldToday = previousToday.current;
      setDate((current) => (!current || current === oldToday ? meta.data.today : current));
      previousToday.current = meta.data.today;
    }
  }, [meta.data?.today]);
  useEffect(() => {
    const refresh = () => setMetaVersion((value) => value + 1);
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);
  function saved(message) {
    setRevision((value) => value + 1);
    setDialog(null);
    setDeleting(null);
    setToast(message);
  }
  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      setError(err.message);
      setLoggingOut(false);
    }
  }
  const title =
    location.pathname === '/readings'
      ? 'Reading history'
      : location.pathname === '/reports'
        ? 'Reports'
        : 'Overview';
  const currentDate = date || meta.data?.today;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {drawer && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={`sidebar ${drawer ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink to="/" aria-label="Sweety home">
            <Brand />
          </NavLink>
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-tagline">A little care, every day.</p>
        <div className="nav-label">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <LayoutDashboard size={19} />
            Overview
            <ChevronRight className="nav-chevron" size={15} />
          </NavLink>
          <NavLink to="/readings">
            <BookOpen size={19} />
            Reading history
            <ChevronRight className="nav-chevron" size={15} />
          </NavLink>
          <NavLink to="/reports">
            <ChartNoAxesCombined size={19} />
            Reports
            <ChevronRight className="nav-chevron" size={15} />
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="note-heart">
            <Heart size={21} />
          </span>
          <h3>
            Small steps.
            <br />A clearer picture.
          </h3>
          <p>Make a little room for your daily check-ins.</p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>Private to your account</span>
          </div>
          <div className="account-row">
            <span className="avatar">
              {user.name
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Personal account</small>
            </div>
            <button
              className="icon-button"
              onClick={signOut}
              disabled={loggingOut}
              aria-label="Log out"
            >
              {loggingOut ? <Spinner /> : <LogOut size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setDrawer(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-parent">My health</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            {meta.data && (
              <span className="topbar-date">
                <CalendarDays size={15} />
                {formatDate(meta.data.today)}
              </span>
            )}
            <span className="private-badge">
              <span />
              Personal workspace
            </span>
          </div>
        </header>
        <main id="main-content">
          {error && <ErrorMessage message={error} />}{' '}
          {meta.error && (
            <ErrorMessage message={meta.error} onRetry={() => setMetaVersion((v) => v + 1)} />
          )}
          {currentDate && meta.data ? (
            <Outlet
              context={{
                date: currentDate,
                setDate,
                today: meta.data.today,
                timeZone: meta.data.timeZone,
                revision,
                refresh: () => setRevision((v) => v + 1),
                openReading: (details = {}) => setDialog({ date: currentDate, ...details }),
                requestDelete: setDeleting,
              }}
            />
          ) : (
            <div className="page-loading">
              <Spinner label="Loading your workspace" />
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Heart size={13} /> Made for your everyday.
          </span>
          <span>Glucose values in mg/dl{meta.data && ` · ${meta.data.timeZone}`}</span>
        </footer>
      </div>
      {dialog && (
        <ReadingDialog
          {...dialog}
          today={meta.data.today}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <DeleteDialog reading={deleting} onClose={() => setDeleting(null)} onDeleted={saved} />
      )}
      <Toast message={toast} onClose={closeToast} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="/readings" element={<History />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
