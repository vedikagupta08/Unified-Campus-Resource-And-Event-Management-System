import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Profile() {
  const token = useToken();
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function load() {
      if (!token) return;
      setError('');
      setLoading(true);
      try {
        const { data } = await api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } });
        setMe(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (!token) return <div className="card p-6 text-center text-gray-600">Please log in.</div>;

  return (
    <div>
      <h2 className="page-title">Profile</h2>
      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}
      {!loading && me && (
        <div className="grid gap-6 md:grid-cols-2">
          {me.activitySummary && (
            <div className="card p-4 md:col-span-2 shadow-card">
              <div className="font-semibold text-gray-900 mb-2">Activity Summary</div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                <span>Events registered: <strong>{me.activitySummary.eventsRegistered ?? 0}</strong></span>
                <span>Events organized: <strong>{me.activitySummary.eventsOrganized ?? 0}</strong></span>
                <span>Events approved (yours): <strong>{me.activitySummary.eventsApproved ?? 0}</strong></span>
              </div>
            </div>
          )}
          <div className="card p-4 shadow-card">
            <div className="font-semibold text-gray-900 mb-3">Personal Details</div>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div><span className="text-gray-500 font-medium">Name:</span> {me.name}</div>
              <div><span className="text-gray-500 font-medium">Email:</span> {me.email}</div>
              <div><span className="text-gray-500 font-medium">Department:</span> {me.department || '—'}</div>
              <div><span className="text-gray-500 font-medium">Academic year:</span> {me.academicYear || '—'}</div>
              <div><span className="text-gray-500 font-medium">Role:</span> {me.globalRole}</div>
            </div>
          </div>

          <div className="card p-4 shadow-card">
            <div className="font-semibold text-gray-900 mb-3">Club Memberships</div>
            <ul className="space-y-2">
              {(me.memberships || []).map(m => (
                <li key={m.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="font-medium text-gray-900">{m.club?.name}</div>
                  <div className="text-sm text-gray-600">Role: {m.clubRole}</div>
                </li>
              ))}
            </ul>
            {(me.memberships || []).length === 0 && <div className="text-sm text-gray-500">No memberships yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

