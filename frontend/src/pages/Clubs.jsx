import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Clubs() {
  const token = useToken();
  const [clubs, setClubs] = React.useState([]);
  const [mine, setMine] = React.useState([]);
  const [error, setError] = React.useState('');

  const load = async () => {
    setError('');
    try {
      const [c, m] = await Promise.all([
        api.get('/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/clubs/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setClubs(c.data);
      setMine(m.data);
    } catch (e) { setError(e.response?.data?.error || 'Failed to load'); }
  };

  React.useEffect(() => { if (token) load(); }, [token]);

  const amMember = (clubId) => mine.some(m => m.clubId === clubId);

  const join = async (clubId) => {
    try {
      await api.post(`/clubs/${clubId}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const leave = async (clubId) => {
    try {
      await api.post(`/clubs/${clubId}/leave`, {}, { headers: { Authorization: `Bearer ${token}` } });
      await load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold mb-2">All Clubs</h3>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
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
  );
}
