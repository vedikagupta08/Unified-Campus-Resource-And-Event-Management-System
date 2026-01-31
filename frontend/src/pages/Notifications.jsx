import React from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

const CATEGORIES = ['All', 'Events', 'Bookings', 'System'];

export default function Notifications() {
  const token = useToken();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('All');

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const params = categoryFilter !== 'All' ? { category: categoryFilter } : {};
      const { data } = await api.get('/notifications/me', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setItems(data || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) load();
  }, [token, categoryFilter]);

  const markRead = async (id) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true, readAt: data.readAt } : n));
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to mark read'));
    }
  };

  const markAllRead = async () => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/notifications/me/mark-all-read', {}, { headers: { Authorization: `Bearer ${token}` } });
      const now = new Date().toISOString();
      setItems(prev => prev.map(n => ({ ...n, read: true, readAt: n.readAt || now })));
      setSuccess(`Marked ${data.updated || 0} as read`);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to mark all as read'));
    }
  };

  if (!token) return <div className="card p-6 text-center text-gray-600">Please log in.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="page-title mb-0">Notifications</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-card' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              {cat}
            </button>
          ))}
          <button className="text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-card" onClick={markAllRead}>
            Mark all read
          </button>
        </div>
      </div>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}

      {!loading && (
        <ul className="space-y-3">
          {items.map(n => (
            <li key={n.id} className={`card p-4 shadow-card ${n.read ? 'opacity-80 border-gray-200' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    {n.category && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{n.category}</span>}
                    {n.type}
                  </div>
                  <div className="text-sm text-gray-700">{n.message}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  {n.read && n.readAt && (
                    <div className="text-xs text-gray-400 mt-0.5">Read at {new Date(n.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
                {!n.read && (
                  <button className="text-xs font-medium px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onClick={() => markRead(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

