import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Register() {
  const token = useToken();
  const [events, setEvents] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const [eRes, rRes] = await Promise.all([
        api.get('/events/public'),
        api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setEvents(eRes.data);
      setMyRegs(rRes.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { if (token) load(); }, [token]);

  const register = async (eventId) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/registrations', { eventId }, { headers: { Authorization: `Bearer ${token}` } });
      const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(data);
      setSuccess('Registered for event');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to register');
    }
  };

  const unregister = async (eventId) => {
    setError('');
    setSuccess('');
    try {
      await api.delete(`/registrations/by-event/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(current => current.filter(r => r.eventId !== eventId));
      setSuccess('Unregistered from event');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to unregister');
    }
  };

  const isRegistered = (eventId) => myRegs.some(r => r.eventId === eventId);

  if (!token) return <div>Please log in to register for events.</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Event Registration</h2>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-3">{success}</div>}
      {loading && <div className="text-gray-500 mb-3">Loading…</div>}
      {!loading && (
        <ul className="space-y-2">
          {events.map(e => (
            <li key={e.id} className="bg-white p-3 rounded border">
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-gray-600">{new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}</div>
              <div className="mt-2">
                {isRegistered(e.id) ? (
                  <button className="text-sm bg-red-600 text-white px-3 py-1 rounded" onClick={() => unregister(e.id)}>Unregister</button>
                ) : (
                  <button className="text-sm bg-green-600 text-white px-3 py-1 rounded" onClick={() => register(e.id)}>Register</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && events.length === 0 && <div className="text-sm text-gray-600">No published events to register for.</div>}
    </div>
  );
}
