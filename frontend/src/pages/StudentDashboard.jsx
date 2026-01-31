import React from 'react';
import axios from 'axios';

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

export default function StudentDashboard() {
  const token = useToken();
  const user = useUser();
  const [events, setEvents] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [clubs, setClubs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function load() {
      setError('');
      setLoading(true);
      try {
        const promises = [api.get('/events/public')];
        if (token) {
          promises.push(api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } }));
          promises.push(api.get('/clubs/me', { headers: { Authorization: `Bearer ${token}` } }));
        }
        const [eventsRes, regsRes, clubsRes] = await Promise.all([
          promises[0],
          promises[1] || Promise.resolve({ data: [] }),
          promises[2] || Promise.resolve({ data: [] })
        ]);
        setEvents(eventsRes.data || []);
        setMyRegs(regsRes.data || []);
        setClubs(clubsRes.data || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const isRegistered = (eventId) => myRegs.some(r => r.eventId === eventId);

  return (
    <div>
      <h2 className="page-title">My Campus Overview</h2>
      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card title="Upcoming Events" body="Browse and register for campus events." link={{ href: "/events", label: "Go to Events" }} />
        <Card title="My Registrations" body="View and manage events you have registered for." link={{ href: "/register", label: "Manage Registrations" }} />
        <Card title="My Clubs" body="See and manage your club memberships." link={{ href: "/clubs", label: "View Clubs" }} />
        <Card title="My Calendar" body="See your registered events on a monthly calendar." link={{ href: "/calendar", label: "Open Calendar" }} />
      </div>

      {token && (
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Your Upcoming Registrations</h3>
            <ul className="space-y-3">
              {events.filter(e => isRegistered(e.id)).map(e => (
                <li key={e.id} className="card p-4 shadow-card">
                  <div className="font-semibold text-gray-900">{e.title}</div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {new Date(e.startDate).toLocaleString()} → {new Date(e.endDate).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
            {events.filter(e => isRegistered(e.id)).length === 0 && (
              <div className="card p-4 text-sm text-gray-500 shadow-card">You have no upcoming registrations yet.</div>
            )}
          </section>
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">My Clubs</h3>
            <ul className="space-y-3">
              {clubs.map(m => (
                <li key={m.id} className="card p-4 shadow-card">
                  <div className="font-semibold text-gray-900">{m.club?.name}</div>
                  <div className="text-sm text-gray-600">Role: {m.clubRole}</div>
                </li>
              ))}
            </ul>
            {clubs.length === 0 && (
              <div className="card p-4 text-sm text-gray-500 shadow-card">You are not a member of any clubs yet.</div>
            )}
          </section>
        </div>
      )}

      {!token && (
        <div className="card p-4 text-sm text-gray-600 shadow-card">
          Please sign in to see your registrations and club memberships.
        </div>
      )}
    </div>
  );
}

function Card({ title, body, link }) {
  return (
    <div className="card p-4 flex flex-col justify-between shadow-card hover:shadow-cardHover transition-shadow">
      <div>
        <div className="font-semibold text-gray-900 mb-2">{title}</div>
        <div className="text-sm text-gray-600">{body}</div>
      </div>
      {link && (
        <a href={link.href} className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {link.label}
        </a>
      )}
    </div>
  );
}

