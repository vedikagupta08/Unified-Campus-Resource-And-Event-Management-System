import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
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

export default function Clubs() {
  const token = useToken();
  const user = useUser();
  const [clubs, setClubs] = React.useState([]);
  const [mine, setMine] = React.useState([]);
  const [roleRequests, setRoleRequests] = React.useState([]);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', description: '' });

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const [c, m, r] = await Promise.all([
        api.get('/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/clubs/me', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/clubs/me/role-requests', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setClubs(c.data);
      setMine(m.data);
      setRoleRequests(r.data || []);
    } catch (e) { setError(apiErrorMessage(e, 'Failed to load')); }
    finally { setLoading(false); }
  };

  const pendingRequestForClub = (clubId) => roleRequests.some(r => r.clubId === clubId);

  React.useEffect(() => { if (token) load(); }, [token]);

  const amMember = (clubId) => mine.some(m => m.clubId === clubId);

  const join = async (clubId) => {
    setError(''); setSuccess('');
    try {
      await api.post(`/clubs/${clubId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      setSuccess('Joined club');
    } catch (e) { setError(apiErrorMessage(e, 'Failed to join')); }
  };

  const leave = async (clubId) => {
    setError(''); setSuccess('');
    try {
      await api.post(`/clubs/${clubId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      setSuccess('Left club');
    } catch (e) { setError(apiErrorMessage(e, 'Failed to leave')); }
  };

  const create = async () => {
    setError(''); setSuccess('');
    try {
      await api.post('/clubs', form, { headers: { Authorization: `Bearer ${token}` } });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      await load();
      setSuccess('Club created');
    } catch (e) { setError(apiErrorMessage(e, 'Failed to create club')); }
  };

  return (
    <div>
      <h2 className="page-title">Clubs</h2>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <LoadingSpinner label="Loading clubs…" />}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">All Clubs</h3>
              {user?.globalRole === 'ADMIN' && (
                !showCreate ? (
                  <button className="btn-primary text-sm" onClick={() => setShowCreate(true)}>Create Club</button>
                ) : null
              )}
            </div>
            {showCreate && (
              <div className="card p-4 mb-4 space-y-3 shadow-card">
                <input className="input-field" placeholder="Club name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <textarea className="input-field min-h-[80px]" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                <div className="flex gap-2">
                  <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={create}>Create</button>
                  <button className="btn-secondary" onClick={() => { setShowCreate(false); setForm({ name: '', description: '' }); }}>Cancel</button>
                </div>
              </div>
            )}
            <ul className="space-y-3">
              {clubs.map(c => (
                <li key={c.id} className="card p-4 flex items-center justify-between shadow-card">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {c.name}
                      {c.active === true && <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-green-100 text-green-700">Active</span>}
                      {c.active === false && <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-200 text-gray-600">Dormant</span>}
                    </div>
                    {c.description && <div className="text-sm text-gray-600 mt-0.5">{c.description}</div>}
                    {c.lastEventAt && <div className="text-xs text-gray-500 mt-0.5">Last event: {new Date(c.lastEventAt).toLocaleDateString()}</div>}
                  </div>
                  <div>
                    {amMember(c.id) ? (
                      <button className="text-sm font-medium bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => leave(c.id)}>Leave</button>
                    ) : (
                      <button className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors" onClick={() => join(c.id)}>Join</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {clubs.length === 0 && <EmptyState icon="clubs" title="No clubs yet" subtitle="Create a club or wait for one to be added." />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">My Memberships</h3>
            {mine.length === 0 ? (
              <EmptyState icon="clubs" title="No memberships" subtitle="Join a club from the list to see it here." />
            ) : (
            <ul className="space-y-3">
              {mine.map(m => (
                <li key={m.id} className="card p-4 flex items-center justify-between shadow-card">
                  <div>
                    <div className="font-semibold text-gray-900">{m.club?.name}</div>
                    <div className="text-sm text-gray-600">Role: {m.clubRole}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.clubRole === 'MEMBER' && !pendingRequestForClub(m.clubId) && (
                      <button
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                        onClick={async () => {
                          setError('');
                          try {
                            await api.post(`/clubs/${m.clubId}/request-organizer`, {}, { headers: { Authorization: `Bearer ${token}` } });
                            setSuccess('Organizer role requested. Club head or admin will review.');
                            load();
                          } catch (e) { setError(apiErrorMessage(e, 'Request failed')); }
                        }}
                      >
                        Request organizer
                      </button>
                    )}
                    {m.clubRole === 'MEMBER' && pendingRequestForClub(m.clubId) && (
                      <span className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-600">Pending request</span>
                    )}
                    {(m.clubRole === 'ORGANIZER' || m.clubRole === 'HEAD') && (
                      <Link
                        to={`/clubs/${m.clubId}/manage`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        Manage
                      </Link>
                    )}
                    <button className="text-sm font-medium bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors" onClick={() => leave(m.clubId)}>Leave</button>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
