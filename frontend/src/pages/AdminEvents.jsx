import React from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError.js';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1]));
    return { id: p.id, email: p.email, globalRole: p.globalRole };
  } catch {
    return null;
  }
}

export default function AdminEvents() {
  const token = useToken();
  const user = useUser();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  if (!user || user.globalRole !== 'ADMIN') {
    return <div className="card p-6 text-center text-gray-600">Admin event approvals – admins only.</div>;
  }

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.get('/events/admin/submitted', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(data || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load submitted events'));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) load();
  }, [token]);

  const review = async (id, approve, reason) => {
    setError('');
    setSuccess('');
    try {
      await api.post(
        `/events/${id}/review`,
        { approve, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(prev => prev.filter(ev => ev.id !== id));
      setSuccess(approve ? 'Event approved' : 'Event rejected');
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to review event'));
    }
  };

  return (
    <div>
      <h2 className="page-title">Event Approvals</h2>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}

      {!loading && (
        <>
          <ul className="space-y-3">
            {items.map(ev => {
              const submittedAt = ev.submittedAt || ev.updatedAt || ev.createdAt;
              const hoursAgo = submittedAt ? (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60) : 0;
              let slaColor = 'text-green-600';
              if (hoursAgo >= 72) slaColor = 'text-red-600';
              else if (hoursAgo >= 24) slaColor = 'text-amber-600';
              const daysAgo = submittedAt ? Math.floor((Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              const submittedText = daysAgo === 0 ? 'Submitted today' : daysAgo === 1 ? 'Submitted 1 day ago' : `Submitted ${daysAgo} days ago`;
              return (
                <li key={ev.id} className="card p-4 shadow-card">
                  <div className="font-semibold text-gray-900">{ev.title}</div>
                  <div className={`text-sm font-medium ${slaColor} mb-1`}>{submittedText}</div>
                  <div className="text-sm text-gray-600 mb-1">
                    {new Date(ev.startDate).toLocaleString()} → {new Date(ev.endDate).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    Created by: {ev.createdBy?.email || ev.createdById}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    Clubs: {ev.clubs?.map(c => c.club?.name || c.clubId).join(', ') || '—'}
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors" onClick={() => review(ev.id, true)}>Approve</button>
                    <button className="text-sm font-medium bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors" onClick={() => { setRejectingId(ev.id); setRejectReason(''); }}>Reject</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {items.length === 0 && <div className="card p-6 text-center text-gray-500">No submitted events waiting for approval.</div>}
        </>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card p-5 w-full max-w-md shadow-cardHover">
            <h3 className="font-semibold text-gray-900 mb-2">Reject event</h3>
            <p className="text-sm text-gray-600 mb-3">
              Rejection reason is required so the organizer understands why this event was rejected.
            </p>
            <textarea
              className="input-field mb-3"
              rows={3}
              placeholder="Reason (required)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            {!rejectReason.trim() && <p className="text-sm text-red-600 mb-2">Please provide a reason before rejecting.</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</button>
              <button className="btn-danger disabled:opacity-50" disabled={!rejectReason.trim()} onClick={async () => {
                if (!rejectReason.trim()) return;
                const id = rejectingId;
                setRejectingId(null);
                await review(id, false, rejectReason.trim());
              }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

