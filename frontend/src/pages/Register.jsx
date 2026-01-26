import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Register() {
  const [published, setPublished] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const token = useToken();

  const load = async () => {
    const { data } = await api.get('/events/public');
    setPublished(data);
    if (token) {
      try {
        const { data: regs } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
        setMyRegs(regs);
      } catch {}
    }
  };

  React.useEffect(() => { load(); }, [token]);

  const isRegistered = (id) => myRegs.some(r => r.eventId === id);

  const register = async (id) => {
    try {
      await api.post('/registrations', { eventId: id }, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      alert('Registered');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const unregister = async (id) => {
    try {
      await api.delete(`/registrations/by-event/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await load();
      alert('Unregistered');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Register for Events</h2>
      <ul className="space-y-2">
        {published.map(e => (
          <li key={e.id} className="bg-white p-3 rounded border">
            <div className="font-medium">{e.title}</div>
            <div className="text-xs text-gray-600">{new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}</div>
            {token ? (
              <div className="mt-2">
                {isRegistered(e.id) ? (
                  <button onClick={() => unregister(e.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded">Unregister</button>
                ) : (
                  <button onClick={() => register(e.id)} className="text-sm bg-green-600 text-white px-3 py-1 rounded">Register</button>
                )}
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-600">Login to register</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
