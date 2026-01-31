import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

function useAuth() {
  const token = localStorage.getItem('token');
  let user = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      user = { id: payload.id, email: payload.email, globalRole: payload.globalRole };
    } catch {}
  }
  return { token, user };
}

function useUnreadCount(token) {
  const [count, setCount] = React.useState(0);
  const [backendUnreachable, setBackendUnreachable] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (!token) { setCount(0); setBackendUnreachable(false); return; }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/me/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (alive) setBackendUnreachable(false);
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setCount(data.count || 0);
      } catch {
        if (alive) setBackendUnreachable(true);
      }
    }
    load();
    // When backend is down, poll less often to avoid console spam
    const intervalMs = backendUnreachable ? 30000 : 10000;
    const id = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [token, backendUnreachable]);
  return { count, backendUnreachable };
}

export default function App() {
  const nav = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { count: unreadCount, backendUnreachable } = useUnreadCount(token);

  React.useEffect(() => {
    if (!token) nav('/login');
  }, [token]);

  // Admins should work in /admin/*, not student dashboard
  React.useEffect(() => {
    if (!token) return;
    if (user?.globalRole === 'ADMIN' && (location.pathname === '/' || location.pathname.startsWith('/dashboard'))) {
      nav('/admin/dashboard');
    }
  }, [token, user?.globalRole, location.pathname]);

  const logout = () => { localStorage.removeItem('token'); nav('/login'); };

  const path = location.pathname;
  const navClass = (to) => (path === to || (to !== '/' && path.startsWith(to))) ? 'nav-link nav-link-active' : 'nav-link';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {backendUnreachable && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-sm shadow-sm">
          Cannot reach server. Start the backend: <code className="bg-amber-700/80 px-1.5 py-0.5 rounded text-xs font-mono">cd backend && npm run dev</code>
        </div>
      )}
      <header className="bg-white border-b border-gray-200 shadow-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="font-semibold text-gray-900 text-lg">Unified Campus</h1>
          <nav className="flex gap-5">
            <Link to="/dashboard" className={navClass('/dashboard')}>Dashboard</Link>
            <Link to="/events" className={navClass('/events')}>Events</Link>
            <Link to="/register" className={navClass('/register')}>Register</Link>
            <Link to="/clubs" className={navClass('/clubs')}>Clubs</Link>
            <Link to="/notifications" className={navClass('/notifications') + ' relative'}>
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 text-[10px] font-semibold bg-red-600 text-white rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/profile" className={navClass('/profile')}>Profile</Link>
            {user?.globalRole !== 'ADMIN' && <span className="text-xs text-gray-500 self-center font-medium">STUDENT VIEW</span>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-600 truncate max-w-[180px]">{user?.email}</span>
            <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        <div key={path} className="page-enter">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 text-center text-sm text-gray-500 py-4 mt-auto">
        Unified Campus — Events, Clubs & Resources
      </footer>
    </div>
  );
}
