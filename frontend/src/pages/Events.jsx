import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const token = useToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.id, email: payload.email, isAdmin: payload.isAdmin };
  } catch {
    return null;
  }
}

export default function Events() {
  const [list, setList] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [clubs, setClubs] = React.useState([]);
  const [selectedClubIds, setSelectedClubIds] = React.useState([]);
  const [myEvents, setMyEvents] = React.useState([]);
  const [title, setTitle] = React.useState('Sample Event');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const token = useToken();
  const user = useUser();

  React.useEffect(() => {
    async function load() {
      const { data } = await api.get('/events/public');
      setList(data);
    }
    load();
  }, []);

  React.useEffect(() => {
    async function loadRegs() {
      if (!token) return;
      try {
        const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
        setMyRegs(data);
      } catch {}
    }
    loadRegs();
  }, [token]);

  React.useEffect(() => {
    async function loadClubsAndMyEvents() {
      if (!token) return;
      try {
        const [clubsRes, myEventsRes] = await Promise.all([
          api.get('/clubs', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/events', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setClubs(clubsRes.data);
        setMyEvents(myEventsRes.data);
      } catch {}
    }
    loadClubsAndMyEvents();
  }, [token]);

  const isRegistered = (eventId) => myRegs.some(r => r.eventId === eventId);

  const register = async (eventId) => {
    try {
      await api.post('/registrations', { eventId }, { headers: { Authorization: `Bearer ${token}` } });
      const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(data);
      alert('Registered');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const unregister = async (eventId) => {
    try {
      await api.delete(`/registrations/by-event/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(current => current.filter(r => r.eventId !== eventId));
      alert('Unregistered');
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const createDraft = async () => {
    try {
      if (selectedClubIds.length === 0) { alert('Select at least one club'); return; }
      const body = { title, startDate, endDate, clubIds: selectedClubIds };
      const { data } = await api.post('/events', body, { headers: { Authorization: `Bearer ${token}` } });
      alert('Draft created: ' + data.id);
      // refresh my events
      const myList = await api.get('/events', { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(myList.data);
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  const submitEvent = async (id) => {
    try {
      const { data } = await api.post(`/events/${id}/submit`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
    } catch (e) { alert(e.response?.data?.error || 'Failed to submit'); }
  };

  const reviewEvent = async (id, approve) => {
    try {
      const { data } = await api.post(`/events/${id}/review`, { approve }, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
    } catch (e) { alert(e.response?.data?.error || 'Failed to review'); }
  };

  const publishEvent = async (id) => {
    try {
      const { data } = await api.post(`/events/${id}/publish`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
      // refresh public list
      const { data: pub } = await api.get('/events/public');
      setList(pub);
    } catch (e) { alert(e.response?.data?.error || 'Failed to publish'); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold mb-2">Published Events</h3>
        <ul className="space-y-2">
          {list.map(e => (
            <li key={e.id} className="bg-white p-3 rounded border">
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-gray-600">{new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}</div>
              {token && (
                <div className="mt-2">
                  {isRegistered(e.id) ? (
                    <button onClick={() => unregister(e.id)} className="text-sm bg-red-600 text-white px-3 py-1 rounded">Unregister</button>
                  ) : (
                    <button onClick={() => register(e.id)} className="text-sm bg-green-600 text-white px-3 py-1 rounded">Register</button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Create Draft (Organizer/Head)</h3>
        <div className="bg-white p-3 rounded border space-y-2">
          <input className="border p-2 w-full" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <div>
            <label className="text-sm text-gray-600">Select Clubs</label>
            <div className="mt-1 grid gap-1">
              {clubs.map(c => (
                <label key={c.id} className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={selectedClubIds.includes(c.id)} onChange={e => {
                    setSelectedClubIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id));
                  }} />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
          <input className="border p-2 w-full" placeholder="Start Date ISO" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          <input className="border p-2 w-full" placeholder="End Date ISO" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          <button onClick={createDraft} className="bg-blue-600 text-white px-4 py-2 rounded">Create Draft</button>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">My Events</h3>
          <ul className="space-y-2">
            {myEvents.map(ev => (
              <li key={ev.id} className="bg-white p-3 rounded border">
                <div className="font-medium">{ev.title} <span className="text-xs text-gray-600">[{ev.status}]</span></div>
                <div className="text-xs text-gray-600">{new Date(ev.startDate).toLocaleString()} → {new Date(ev.endDate).toLocaleString()}</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {ev.status === 'DRAFT' && (
                    <button onClick={() => submitEvent(ev.id)} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded">Submit</button>
                  )}
                  {user?.isAdmin && ev.status === 'SUBMITTED' && (
                    <>
                      <button onClick={() => reviewEvent(ev.id, true)} className="text-sm bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                      <button onClick={() => reviewEvent(ev.id, false)} className="text-sm bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                    </>
                  )}
                  {(ev.status === 'APPROVED') && (
                    <button onClick={() => publishEvent(ev.id)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Publish</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
