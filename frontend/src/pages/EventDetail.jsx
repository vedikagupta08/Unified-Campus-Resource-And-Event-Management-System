import React from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const token = useToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.id, email: payload.email, globalRole: payload.globalRole };
  } catch {
    return null;
  }
}

function daysLeft(ev) {
  const deadline = ev.registrationDeadline ? new Date(ev.registrationDeadline) : new Date(ev.startDate);
  const now = new Date();
  const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `${diff} Days Left`;
  if (diff === 0) return 'Last day';
  return 'Ended';
}

function teamSizeLabel(ev) {
  if (ev.teamSizeMin != null && ev.teamSizeMax != null) return `${ev.teamSizeMin}-${ev.teamSizeMax} Members`;
  if (ev.teamSizeMin != null) return `${ev.teamSizeMin}+ Members`;
  if (ev.teamSizeMax != null) return `Up to ${ev.teamSizeMax} Members`;
  return null;
}

export default function EventDetail() {
  const { id } = useParams();
  const token = useToken();
  const user = useUser();
  const [event, setEvent] = React.useState(null);
  const [relatedEvents, setRelatedEvents] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('Details');
  const [descriptionExpanded, setDescriptionExpanded] = React.useState(false);
  const [registerModal, setRegisterModal] = React.useState(false);
  const [department, setDepartment] = React.useState('');
  const [academicYear, setAcademicYear] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [actionSuccess, setActionSuccess] = React.useState('');
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/events/public/${id}`);
        if (alive) setEvent(data);
      } catch (e) {
        if (alive) setError(e.response?.data?.error || 'Event not found');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    api.get('/events/public')
      .then(({ data }) => {
        if (alive && Array.isArray(data)) setRelatedEvents(data.filter(e => e.id !== id).slice(0, 6));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);

  React.useEffect(() => {
    if (!token) return;
    let alive = true;
    Promise.all([
      api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } }),
      api.get('/users/me', { headers: { Authorization: `Bearer ${token}` } })
    ]).then(([regRes, meRes]) => {
      if (alive) {
        setMyRegs(regRes.data);
        setProfile(meRes.data);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [token]);

  const isRegistered = event && myRegs.some(r => r.eventId === event.id);
  const isOrganizer = event && event.createdById === user?.id;
  const isAdmin = user?.globalRole === 'ADMIN';
  const registrationDeadline = event?.registrationDeadline ? new Date(event.registrationDeadline) : event?.startDate ? new Date(event.startDate) : null;
  const registrationClosed = registrationDeadline && new Date() > registrationDeadline;

  const handleRegister = async () => {
    setFormError('');
    if (!department.trim() || !academicYear.trim()) {
      setFormError('Please fill Department and Academic Year.');
      return;
    }
    try {
      await api.post('/registrations', {
        eventId: event.id,
        department: department.trim(),
        academicYear: academicYear.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(data);
      setRegisterModal(false);
      setActionSuccess('Registered successfully.');
    } catch (e) {
      setFormError(e.response?.data?.error || 'Registration failed');
    }
  };

  const handleUnregister = async () => {
    if (!confirm('Unregister from this event?')) return;
    try {
      await api.delete(`/registrations/by-event/${event.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(prev => prev.filter(r => r.eventId !== event.id));
      setActionSuccess('Unregistered.');
    } catch (e) {
      setError(e.response?.data?.error || 'Unregister failed');
    }
  };

  if (loading) return <div className="card p-6 text-center text-gray-500 shadow-card">Loading event…</div>;
  if (error || !event) {
    return (
      <div className="card p-6 shadow-card">
        <p className="text-red-600 font-medium">{error || 'Event not found'}</p>
        <Link to="/events" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block transition-colors">← Back to Events</Link>
      </div>
    );
  }

  const clubNames = event.clubs?.map(ec => ec.club?.name).filter(Boolean).join(', ') || event.createdBy?.name || '—';
  const venue = event.location || event.bookings?.[0]?.resource?.name || '—';
  const desc = event.description || '';
  const showReadMore = desc.length > 280;
  const descShort = showReadMore && !descriptionExpanded ? desc.slice(0, 280) + '…' : desc;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <Link to="/events" className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-4 inline-block transition-colors">← Back to Events</Link>
      {actionSuccess && <div className="alert-success mb-4">{actionSuccess}</div>}

      {/* Tabs (Unstop-style) */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('Details')}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'Details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('FAQs')}
          className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'FAQs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          FAQs & Discussions
        </button>
      </div>

      {activeTab === 'Details' && (
        <>
          {/* Event overview card (screenshot 2 style) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
            <div className="p-5 sm:p-6 flex flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                {event.category && (
                  <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium mb-2">
                    {event.category}
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{event.title}</h1>
                <p className="text-gray-600 mt-1">{clubNames}</p>
                <div className="mt-3 space-y-1.5 text-sm text-gray-700">
                  {venue !== '—' && (
                    <p className="flex items-start gap-2">
                      <span aria-hidden>📍</span>
                      <span>{venue}</span>
                    </p>
                  )}
                  {teamSizeLabel(event) && (
                    <p className="flex items-center gap-2">
                      <span aria-hidden>👥</span>
                      {teamSizeLabel(event)}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span aria-hidden>📅</span>
                    {new Date(event.startDate).toLocaleString()} – {new Date(event.endDate).toLocaleString()}
                  </p>
                  {event.participationFee != null && event.participationFee > 0 && (
                    <p>₹ {event.participationFee} participation fee</p>
                  )}
                </div>
              </div>
              <div className="shrink-0 w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl" aria-hidden>
                🏆
              </div>
            </div>
          </div>

          {/* All that you need to know */}
          {desc && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">All that you need to know about {event.title}</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-gray-700 whitespace-pre-wrap">
                {descShort}
                {showReadMore && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="mt-2 text-blue-600 font-medium text-sm hover:underline"
                  >
                    {descriptionExpanded ? 'Read less' : 'Read more'}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Booked resources */}
          {event.bookings?.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Booked resources</h2>
              <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {event.bookings.map(b => (
                  <li key={b.id} className="px-5 py-3 text-gray-700">
                    {b.resource?.name} ({b.resource?.type})
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Related opportunities */}
          {relatedEvents.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Related opportunities</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {relatedEvents.map(e => (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="shrink-0 w-56 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900 truncate">{e.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {e.clubs?.map(ec => ec.club?.name).filter(Boolean).join(', ') || e.createdBy?.name || '—'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">{new Date(e.startDate).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </>
      )}

      {activeTab === 'FAQs' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Frequently Asked Questions / Discussions</h2>
          <p className="text-gray-500 text-sm">No posts yet. Start a new discussion (feature coming soon).</p>
        </div>
      )}

      {/* Fixed / sticky Register CTA (screenshot 2 style) */}
      <div className="sticky bottom-0 left-0 right-0 mt-8 p-4 bg-white border-t border-gray-200 shadow-lg rounded-t-xl">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded">
              {daysLeft(event)}
            </span>
            <span className="text-xs text-gray-500">
              Updated on {new Date(event.updatedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <span className="text-sm text-gray-500">Admins cannot register.</span>}
            {!isAdmin && isOrganizer && <span className="text-sm text-gray-500">You organized this event.</span>}
            {!isAdmin && !isOrganizer && !token && (
              <Link to="/login" className="w-full sm:w-auto inline-block text-center bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700">
                Log in to Register
              </Link>
            )}
            {!isAdmin && !isOrganizer && token && (
              isRegistered ? (
                <button
                  onClick={handleUnregister}
                  className="w-full sm:w-auto bg-red-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-700"
                >
                  Unregister
                </button>
              ) : registrationClosed ? (
                <div className="text-sm text-gray-600">
                  Registration closed on {registrationDeadline.toLocaleDateString()}.
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (profile?.department) setDepartment(profile.department);
                    if (profile?.academicYear) setAcademicYear(profile.academicYear);
                    setRegisterModal(true);
                  }}
                  className="w-full sm:w-auto bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Register
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Register modal */}
      {registerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="font-semibold text-lg mb-2">Register for {event.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Details are pre-filled from your profile; you can edit before confirming.</p>
            {formError && <p className="text-red-600 text-sm mb-2">{formError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                <input
                  className="border rounded-lg w-full px-3 py-2"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                <input
                  className="border rounded-lg w-full px-3 py-2"
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 3rd Year"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleRegister} className="flex-1 bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700">
                Register
              </button>
              <button onClick={() => { setRegisterModal(false); setFormError(''); }} className="border border-gray-300 px-4 py-2.5 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
