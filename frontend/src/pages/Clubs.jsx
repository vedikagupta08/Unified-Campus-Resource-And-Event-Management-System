import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { isAdmin: p.isAdmin }; } catch { return null; }
}

export default function Clubs() {
  const token = useToken();
  const user = useUser();
  const [clubs, setClubs] = React.useState([]);
  const [mine, setMine] = React.useState([]);
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
      const [c, m] = await Promise.all([
        api.get('/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/clubs/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setClubs(c.data);
      setMine(m.data);
    } catch (e) { setError(e.response?.data?.error || 'Failed to load'); }
    finally { setLoading(false); }
  };

  React.useEffect(() => { if (token) load(); }, [token]);

  const amMember = (clubId) => mine.some(m => m.clubId === clubId);

  const join = async (clubId) => {
    setError(''); setSuccess('');
    try {
      await api.post(`/clubs/${clubId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      setSuccess('Joined club');
    } catch (e) { setError(e.response?.data?.error || 'Failed to join'); }
  };

  const leave = async (clubId) => {
    setError(''); setSuccess('');
    try {
      await api.post(`/clubs/${clubId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      setSuccess('Left club');
    } catch (e) { setError(e.response?.data?.error || 'Failed to leave'); }
  };

  const create = async () => {
    setError(''); setSuccess('');
    try {
      await api.post('/clubs', form, { headers: { Authorization: `Bearer ${token}` } });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      await load();
      setSuccess('Club created');
    } catch (e) { setError(e.response?.data?.error || 'Failed to create club'); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clubs</h2>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-3">{success}</div>}
      {loading && <div className="text-gray-500 mb-3">Loading…</div>}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">All Clubs</h3>
              {user?.isAdmin && (
                !showCreate ? (
                  <button className="text-sm px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setShowCreate(true)}>Create Club</button>
                ) : null
              )}
            </div>
            {showCreate && (
              <div className="bg-white p-3 rounded border mb-3 space-y-2">
                <input className="border p-2 w-full" placeholder="Club name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <textarea className="border p-2 w-full" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                <div className="flex gap-2">
                  <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={create}>Create</button>
                  <button className="px-3 py-2 bg-gray-600 text-white rounded" onClick={() => { setShowCreate(false); setForm({ name: '', description: '' }); }}>Cancel</button>
                </div>
              </div>
            )}
            <ul className="space-y-2">
              {clubs.map(c => (
                <li key={c.id} className="bg-white p-3 rounded border flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {c.description && <div className="text-xs text-gray-600">{c.description}</div>}
                  </div>
                  <div>
                    {amMember(c.id) ? (
                      <button className="text-sm bg-gray-200 px-3 py-1 rounded" onClick={() => leave(c.id)}>Leave</button>
                    ) : (
                      <button className="text-sm bg-green-600 text-white px-3 py-1 rounded" onClick={() => join(c.id)}>Join</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {clubs.length === 0 && <div className="text-sm text-gray-600">No clubs found.</div>}
          </div>
          <div>
            <h3 className="font-semibold mb-2">My Memberships</h3>
            <ul className="space-y-2">
              {mine.map(m => (
                <li key={m.id} className="bg-white p-3 rounded border flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.club?.name}</div>
                    <div className="text-xs text-gray-600">Role: {m.role}</div>
                  </div>
                  <button className="text-sm bg-gray-200 px-3 py-1 rounded" onClick={() => leave(m.clubId)}>Leave</button>
                </li>
              ))}
              {mine.length === 0 && <div className="text-sm text-gray-600">You have no memberships yet.</div>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
