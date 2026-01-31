import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

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

function useBackendReachable(token) {
  const [unreachable, setUnreachable] = React.useState(false);
  React.useEffect(() => {
    if (!token) { setUnreachable(false); return; }
    let alive = true;
    async function check() {
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/me/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (alive) setUnreachable(false);
      } catch {
        if (alive) setUnreachable(true);
      }
    }
    check();
    // When backend is down, poll less often to avoid console spam
    const intervalMs = unreachable ? 30000 : 10000;
    const id = setInterval(check, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [token, unreachable]);
  return unreachable;
}

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const backendUnreachable = useBackendReachable(token);

  const path = location.pathname;
  const adminNavClass = (to) => path === to ? 'text-white font-medium' : 'text-gray-300 hover:text-white font-medium transition-colors';

  React.useEffect(() => {
    if (!token) nav('/login');
    if (token && user?.globalRole !== 'ADMIN') nav('/dashboard');
  }, [token, user?.globalRole]);

  const logout = () => {
    localStorage.removeItem('token');
    nav('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {backendUnreachable && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-sm shadow-sm">
          Cannot reach server. Start the backend: <code className="bg-amber-700/80 px-1.5 py-0.5 rounded text-xs font-mono">cd backend && npm run dev</code>
        </div>
      )}
      <header className="bg-gray-900 text-white border-b border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="font-semibold tracking-wide text-white">
            ADMIN PANEL
          </div>
          <nav className="flex gap-5 text-sm">
            <Link to="/admin/dashboard" className={adminNavClass('/admin/dashboard')}>Dashboard</Link>
            <Link to="/admin/events" className={adminNavClass('/admin/events')}>Event Approvals</Link>
            <Link to="/admin/resources" className={adminNavClass('/admin/resources')}>Resources</Link>
            <Link to="/admin/bookings" className={adminNavClass('/admin/bookings')}>Bookings</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-300 truncate max-w-[180px]">{user?.email}</span>
            <button onClick={logout} className="text-sm font-medium text-red-300 hover:text-red-200 transition-colors">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        <div key={path} className="page-enter">
          <Outlet />
        </div>
      </main>
      <footer className="bg-gray-900 border-t border-gray-800 text-center text-sm text-gray-400 py-4 mt-auto">
        Admin — Unified Campus
      </footer>
    </div>
  );
}

