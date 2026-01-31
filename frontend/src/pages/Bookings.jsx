import React from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });

function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { globalRole: p.globalRole }; } catch { return null; }
}

export default function Bookings() {
  const token = useToken();
  const user = useUser();
  const [tab, setTab] = React.useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const load = async (which = tab) => {
    setError('');
    setLoading(true);
    try {
      const path = which === 'approved' ? '/bookings/approved' : which === 'rejected' ? '/bookings/rejected' : '/bookings/pending';
      const { data } = await api.get(path, { headers: { Authorization: `Bearer ${token}` } });
      setItems(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { if (token) load('pending'); }, [token]);
  React.useEffect(() => { if (token) load(tab); }, [tab]);

  const review = async (id, approve, reason) => {
    try {
      await api.post(`/bookings/${id}/review`, { approve, reason }, { headers: { Authorization: `Bearer ${token}` } });
      // remove item from current list
      setItems(prev => prev.filter(b => b.id !== id));
    } catch (e) { alert(apiErrorMessage(e, 'Failed')); }
  };

  if (!user?.globalRole || user.globalRole !== 'ADMIN') return <div className="card p-6 text-center text-gray-600">Admin only.</div>;

  return (
    <div>
      <h2 className="page-title">Pending Bookings</h2>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab==='pending'?'bg-blue-600 text-white shadow-card':'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Pending</button>
        <button onClick={() => setTab('approved')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab==='approved'?'bg-blue-600 text-white shadow-card':'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Approved</button>
        <button onClick={() => setTab('rejected')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab==='rejected'?'bg-blue-600 text-white shadow-card':'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Rejected</button>
      </div>
      {error && <div className="alert-error">{error}</div>}
      {loading ? <div className="text-sm text-gray-500 mb-4">Loading…</div> : (
        <>
          <ul className="space-y-3">
            {items.map(b => (
              <li key={b.id} className="card p-4 shadow-card">
                <div className="font-semibold text-gray-900">{b.resource?.name} — {b.event?.title}</div>
                <div className="text-sm text-gray-600 mt-0.5">{new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</div>
                {tab === 'rejected' && b.rejectionReason && (
                  <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Rejection: {b.rejectionReason}
                  </div>
                )}
                {tab==='pending' && (
                  <div className="mt-3 flex gap-2">
                    <button className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors" onClick={() => review(b.id, true)}>Approve</button>
                    <button className="text-sm font-medium bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors" onClick={() => { setRejectingId(b.id); setRejectReason(''); }}>Reject</button>
                  </div>
                )}
                {tab!=='pending' && !b.rejectionReason && (
                  <div className="mt-2 text-sm text-gray-500">Status: {tab}</div>
                )}
              </li>
            ))}
          </ul>
          )}
        </>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-5 w-full max-w-md shadow-cardHover">
            <h3 className="font-semibold text-gray-900 mb-2">Reject booking</h3>
            <p className="text-sm text-gray-600 mb-3">
              Provide a reason. If the booking conflicts with another event, the organizer will see the conflict details (e.g. &quot;Conflicts with Event X (10:00–12:00)&quot;) in the notification.
            </p>
            <textarea
              className="input-field mb-4"
              rows={3}
              placeholder="Reason (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
              <button className="btn-danger" onClick={async () => {
                const id = rejectingId;
                setRejectingId(null);
                await review(id, false, rejectReason);
              }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
