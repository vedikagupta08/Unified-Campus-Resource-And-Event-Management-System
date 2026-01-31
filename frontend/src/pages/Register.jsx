import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

function daysLeft(ev) {
  const deadline = ev.registrationDeadline ? new Date(ev.registrationDeadline) : new Date(ev.startDate);
  const now = new Date();
  const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `${diff} days left` : diff === 0 ? 'Last day' : 'Ended';
}

function teamSizeLabel(ev) {
  if (ev.teamSizeMin != null && ev.teamSizeMax != null) return `${ev.teamSizeMin} - ${ev.teamSizeMax} Members`;
  if (ev.teamSizeMin != null) return `${ev.teamSizeMin}+ Members`;
  if (ev.teamSizeMax != null) return `Up to ${ev.teamSizeMax} Members`;
  return null;
}

export default function Register() {
  const token = useToken();
  const [events, setEvents] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [registerModal, setRegisterModal] = React.useState(null);
  const [profile, setProfile] = React.useState(null);

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const [eRes, rRes, meRes] = await Promise.all([
        api.get('/events/public'),
        api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setEvents(eRes.data);
      setMyRegs(rRes.data);
      setProfile(meRes.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { if (token) load(); }, [token]);

  function isRegistrationClosed(ev) {
    const deadline = ev.registrationDeadline ? new Date(ev.registrationDeadline) : new Date(ev.startDate);
    return new Date() > deadline;
  }

  const register = async (eventId, info = {}) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/registrations', { eventId, ...info }, { headers: { Authorization: `Bearer ${token}` } });
      const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(data);
      setSuccess('Registered for event');
      setRegisterModal(null);
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to register';
      const closedOn = e.response?.data?.registrationClosedOn;
      setError(closedOn ? `Registration closed on ${new Date(closedOn).toLocaleDateString()}.` : msg);
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

  const filteredEvents = events.filter(e => {
    const matchSearch = !searchQuery.trim() ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.clubs?.map(ec => ec.club?.name).join(' ').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  if (!token) return <div className="card p-6 text-center text-gray-600">Please log in to register for events.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="page-title">Event Registration</h2>
      <p className="text-sm text-gray-600 mb-4">Browse published events and register. Open an event for full details.</p>

      <input
        type="search"
        placeholder="Search events..."
        className="input-field mb-4"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <div className="text-gray-500 mb-4">Loading events…</div>}

      {!loading && filteredEvents.length === 0 && (
        <div className="card p-8 text-center text-gray-500 shadow-card">
          No events match your search. Try another category or search term, or <Link to="/events" className="text-blue-600 hover:underline">browse all events</Link>.
        </div>
      )}

      {!loading && filteredEvents.map(e => {
        const organizerName = e.clubs?.length ? e.clubs.map(ec => ec.club?.name).filter(Boolean).join(', ') : (e.createdBy?.name || '—');
        const tags = (e.eligibilityTags || '').split(',').map(s => s.trim()).filter(Boolean);
        return (
          <article key={e.id} className="card overflow-hidden hover:shadow-cardHover transition-shadow mb-4">
            <div className="p-4 sm:p-5 flex gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">
                  <Link to={`/events/${e.id}`} className="text-blue-600 hover:underline">{e.title}</Link>
                </h3>
                <p className="text-sm text-gray-600 mt-0.5 truncate">{organizerName}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                  {e.participationFee != null && e.participationFee > 0 ? (
                    <span>₹ {e.participationFee} Fee</span>
                  ) : (
                    <span className="text-green-600 font-medium">Free</span>
                  )}
                  {teamSizeLabel(e) && <span>{teamSizeLabel(e)}</span>}
                </div>
                {e.location && (
                  <p className="mt-1 text-xs text-gray-500 truncate flex items-center gap-1">
                    <span aria-hidden>📍</span> {e.location}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">{t}</span>
                  ))}
                  {tags.length > 3 && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">+{tags.length - 3}</span>}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span>📅 {new Date(e.startDate).toLocaleDateString()}</span>
                  <span>⏱ {daysLeft(e)}</span>
                </div>
              </div>
              <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xl" aria-hidden>
                🏆
              </div>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
              <Link to={`/events/${e.id}`} className="text-sm text-blue-600 font-medium hover:underline">
                View full details →
              </Link>
              {isRegistered(e.id) ? (
                <button
                  type="button"
                  onClick={() => unregister(e.id)}
                  className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-red-700"
                >
                  Unregister
                </button>
              ) : isRegistrationClosed(e) ? (
                <span className="text-sm text-gray-500">
                  Registration closed on {new Date(e.registrationDeadline || e.startDate).toLocaleDateString()}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRegisterModal({
                    event: e,
                    department: profile?.department || '',
                    academicYear: profile?.academicYear || ''
                  })}
                  className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700"
                >
                  Register
                </button>
              )}
            </div>
          </article>
        );
      })}

      {registerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Register for {registerModal.event.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Details are pre-filled from your profile; you can edit before confirming.</p>
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <input
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={registerModal.department}
                  onChange={e => setRegisterModal(m => ({ ...m, department: e.target.value }))}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                <input
                  className="border border-gray-300 rounded-lg w-full px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={registerModal.academicYear}
                  onChange={e => setRegisterModal(m => ({ ...m, academicYear: e.target.value }))}
                  placeholder="e.g. 3rd Year"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50 font-medium"
                onClick={() => setRegisterModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700"
                onClick={() => {
                  if (!registerModal.department?.trim() || !registerModal.academicYear?.trim()) {
                    setError('Please fill Department and Academic Year.');
                    return;
                  }
                  register(registerModal.event.id, { department: registerModal.department.trim(), academicYear: registerModal.academicYear.trim() });
                }}
              >
                Confirm Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
