import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

function useAuth() {
  const token = localStorage.getItem('token');
  let user = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      user = { id: payload.id, email: payload.email, isAdmin: payload.isAdmin };
    } catch {}
  }
  return { token, user };
}

export default function App() {
  const nav = useNavigate();
  const { token, user } = useAuth();

  React.useEffect(() => {
    if (!token) nav('/login');
  }, [token]);

  const logout = () => { localStorage.removeItem('token'); nav('/login'); };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="font-semibold">Unified Campus</h1>
          <nav className="flex gap-4">
            <Link to="/">Dashboard</Link>
            <Link to="/events">Events</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/register">Register</Link>
            <Link to="/clubs">Clubs</Link>
            {user?.isAdmin && <Link to="/bookings">Bookings</Link>}
            {user?.isAdmin && <span className="text-sm text-green-700">Admin</span>}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button onClick={logout} className="text-sm text-red-600">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
