import React from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

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

export default function Events() {
  const [list, setList] = React.useState([]);
  const [myRegs, setMyRegs] = React.useState([]);
  const [clubs, setClubs] = React.useState([]);
  const [myEvents, setMyEvents] = React.useState([]);
  const [resources, setResources] = React.useState([]);
  const [bookingInputs, setBookingInputs] = React.useState({});
  const [selectedClubIds, setSelectedClubIds] = React.useState([]);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState('Sample Event');
  const [location, setLocation] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [participationFee, setParticipationFee] = React.useState('');
  const [teamSizeMin, setTeamSizeMin] = React.useState('');
  const [teamSizeMax, setTeamSizeMax] = React.useState('');
  const [categoryDraft, setCategoryDraft] = React.useState('');
  const [eligibilityTags, setEligibilityTags] = React.useState('');
  const [registrationDeadline, setRegistrationDeadline] = React.useState('');
  const [modalEvent, setModalEvent] = React.useState(null);
  const [registrationsModal, setRegistrationsModal] = React.useState({ event: null, list: [] });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [eventsTab, setEventsTab] = React.useState('all'); // 'all' | 'my'
  const token = useToken();
  const user = useUser();
  const isAdmin = user?.globalRole === 'ADMIN';

  const myEventIds = new Set([...myRegs.map(r => r.eventId), ...myEvents.map(e => e.id)]);
  const myEventsList = list.filter(e => myEventIds.has(e.id));
  const allEventsList = list;

  const filteredList = (eventsTab === 'my' ? myEventsList : allEventsList).filter(e => {
    const matchSearch = !searchQuery.trim() || e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.clubs?.map(ec => ec.club?.name).join(' ').toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get('/events/public');
        setList(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  React.useEffect(() => {
    async function loadRegs() {
      if (!token) return;
      try {
        const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
        setMyRegs(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load registrations');
      }
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
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load clubs/my events');
      }
    }
    loadClubsAndMyEvents();
  }, [token]);

  React.useEffect(() => {
    async function loadResources() {
      if (!token) return;
      try {
        const { data } = await api.get('/resources', { headers: { Authorization: `Bearer ${token}` } });
        setResources(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load resources');
      }
    }
    loadResources();
  }, [token]);

  const isRegistered = (eventId) => myRegs.some(r => r.eventId === eventId);

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

  const openRegisterModal = (event) => {
    setError('');
    setSuccess('');
    setModalEvent(event);
  };

  const register = async (eventId, info = {}) => {
    setError(''); setSuccess('');
    try {
      await api.post('/registrations', { eventId, ...info }, { headers: { Authorization: `Bearer ${token}` } });
      const { data } = await api.get('/registrations/me', { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(data);
      setSuccess('Registered for event');
    } catch (e) { setError(e.response?.data?.error || 'Failed to register'); }
  };

  const unregister = async (eventId) => {
    setError(''); setSuccess('');
    try {
      await api.delete(`/registrations/by-event/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMyRegs(current => current.filter(r => r.eventId !== eventId));
      setSuccess('Unregistered from event');
    } catch (e) { setError(e.response?.data?.error || 'Failed to unregister'); }
  };

  const createDraft = async () => {
    setError(''); setSuccess('');
    try {
      if (selectedClubIds.length === 0) { setError('Select at least one club'); return; }
      const body = { title, startDate, endDate, clubIds: selectedClubIds };
      if (location.trim()) body.location = location.trim();
      if (participationFee !== '') body.participationFee = parseInt(participationFee, 10) || 0;
      if (teamSizeMin !== '') body.teamSizeMin = parseInt(teamSizeMin, 10) || null;
      if (teamSizeMax !== '') body.teamSizeMax = parseInt(teamSizeMax, 10) || null;
      if (categoryDraft.trim()) body.category = categoryDraft.trim();
      if (eligibilityTags.trim()) body.eligibilityTags = eligibilityTags.trim();
      if (registrationDeadline.trim()) body.registrationDeadline = registrationDeadline.trim();
      const { data } = await api.post('/events', body, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Draft created');
      // refresh my events
      const myList = await api.get('/events', { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(myList.data);
    } catch (e) { setError(e.response?.data?.error || 'Failed to create draft'); }
  };

  const submitEvent = async (id) => {
    setError(''); setSuccess('');
    try {
      const { data } = await api.post(`/events/${id}/submit`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
      setSuccess('Event submitted for approval');
    } catch (e) { setError(e.response?.data?.error || 'Failed to submit'); }
  };

  const reviewEvent = async (id, approve) => {
    setError(''); setSuccess('');
    try {
      const { data } = await api.post(`/events/${id}/review`, { approve }, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
      setSuccess(approve ? 'Event approved' : 'Event rejected');
    } catch (e) { setError(e.response?.data?.error || 'Failed to review'); }
  };

  const publishEvent = async (id) => {
    setError(''); setSuccess('');
    try {
      const { data } = await api.post(`/events/${id}/publish`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMyEvents(prev => prev.map(ev => ev.id === id ? data : ev));
      // refresh public list
      const { data: pub } = await api.get('/events/public');
      setList(pub);
      setSuccess('Event published');
    } catch (e) { setError(e.response?.data?.error || 'Failed to publish'); }
  };

  const changeBookingInput = (eventId, field, value) => {
    setBookingInputs(prev => ({ ...prev, [eventId]: { ...(prev[eventId]||{}), [field]: value } }));
  };

  const requestBooking = async (eventId) => {
    setError(''); setSuccess('');
    try {
      const inputs = bookingInputs[eventId] || {};
      if (!inputs.resourceId || !inputs.startTime || !inputs.endTime) {
        setError('Select resource and set start/end');
        return;
      }
      await api.post('/bookings', { eventId, resourceId: inputs.resourceId, startTime: inputs.startTime, endTime: inputs.endTime }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('Booking requested');
    } catch (e) { setError(e.response?.data?.error || 'Failed to request booking'); }
  };

  const openRegistrationsModal = async (event) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.get(`/registrations/by-event/${event.id}/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistrationsModal({ event, list: data || [] });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load registrations for event');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header + Search (Unstop-style) */}
      <div className="mb-4">
        <h2 className="page-title">Events & Competitions</h2>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setEventsTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${eventsTab === 'all' ? 'bg-blue-600 text-white shadow-card' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            All Events
          </button>
          <button
            type="button"
            onClick={() => setEventsTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${eventsTab === 'my' ? 'bg-blue-600 text-white shadow-card' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            My Events
          </button>
        </div>
        <input
          type="search"
          placeholder="Search events..."
          className="input-field"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <LoadingSpinner label="Loading events…" />}

      {/* All Events tab: event cards + Create Draft form */}
      {eventsTab === 'all' && (
        <>
          <div className="space-y-4 mb-8">
            {!loading && filteredList.length === 0 && (
              <EmptyState icon="events" title="No events match" subtitle={searchQuery.trim() ? 'Try another search term.' : 'No events yet. Create a draft or wait for events to be published.'} />
            )}
            {!loading && filteredList.map(e => {
              const organizerName = e.clubs?.length ? e.clubs.map(ec => ec.club?.name).filter(Boolean).join(', ') : (e.createdBy?.name || '—');
              const tags = (e.eligibilityTags || '').split(',').map(s => s.trim()).filter(Boolean);
              return (
                <Link key={e.id} to={`/events/${e.id}`} className="block">
                  <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 sm:p-5 flex gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{e.title}</h3>
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
                      {token && (isAdmin || e.createdById === user?.id) ? (
                        <button
                          type="button"
                          onClick={ev => { ev.preventDefault(); ev.stopPropagation(); openRegistrationsModal(e); }}
                          className="text-sm text-blue-600 font-medium hover:underline"
                        >
                          View Registrations
                        </button>
                      ) : token && !isAdmin ? (
                        <span className={`text-sm font-medium ${isRegistered(e.id) ? 'text-red-600' : 'text-green-600'}`}>
                          {isRegistered(e.id) ? 'Registered' : 'Register →'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">View details →</span>
                      )}
                      <span className="text-gray-300" aria-hidden>♡</span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>

          {/* Create Draft – only on All Events */}
          {token && clubs.length > 0 && (
            <div className="border border-gray-200 rounded-xl p-4 bg-white mb-8">
              <h3 className="font-semibold mb-3">For organizers – Create draft</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <input className="border p-2 rounded" placeholder="Event name" value={title} onChange={e=>setTitle(e.target.value)} />
                <input className="border p-2 rounded" placeholder="Location (optional)" value={location} onChange={e=>setLocation(e.target.value)} />
                <input type="number" className="border p-2 rounded" placeholder="Fee ₹ (optional)" value={participationFee} onChange={e=>setParticipationFee(e.target.value)} />
                <input type="number" className="border p-2 rounded" placeholder="Team min (optional)" value={teamSizeMin} onChange={e=>setTeamSizeMin(e.target.value)} />
                <input type="number" className="border p-2 rounded" placeholder="Team max (optional)" value={teamSizeMax} onChange={e=>setTeamSizeMax(e.target.value)} />
                <input className="border p-2 rounded" placeholder="Category (e.g. Hackathon)" value={categoryDraft} onChange={e=>setCategoryDraft(e.target.value)} />
                <input className="border p-2 rounded sm:col-span-2" placeholder="Eligibility tags, comma-separated" value={eligibilityTags} onChange={e=>setEligibilityTags(e.target.value)} />
                <input className="border p-2 rounded" placeholder="Registration deadline ISO (optional)" value={registrationDeadline} onChange={e=>setRegistrationDeadline(e.target.value)} />
                <input className="border p-2 rounded" placeholder="Start Date ISO" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                <input className="border p-2 rounded" placeholder="End Date ISO" value={endDate} onChange={e=>setEndDate(e.target.value)} />
              </div>
              <div className="mt-2">
                <label className="text-sm text-gray-600">Select Clubs</label>
                <div className="mt-1 flex flex-wrap gap-2">
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
              <button onClick={createDraft} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded">Create Draft</button>
            </div>
          )}
        </>
      )}

      {/* My Events tab: My Events list + Request Booking only */}
      {eventsTab === 'my' && (
        <div className="space-y-6 mb-8">
          {!loading && myEventsList.length === 0 && (
            <EmptyState icon="events" title="No events yet" subtitle="Switch to All Events to browse and register, or create a draft." actionLabel="View all events" actionTo="/events" />
          )}
          {!loading && myEvents.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              <h3 className="font-semibold px-4 py-3 bg-gray-50 border-b">My Events</h3>
              <ul className="divide-y divide-gray-200">
                {myEvents.map(ev => (
                  <li key={ev.id} className="p-4">
                    {(ev.status === 'DRAFT' || ev.status === 'SUBMITTED') && (
                      <div className="mb-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                        This event is not visible to students until approved.
                      </div>
                    )}
                    <div className="font-medium">{ev.title} <span className="text-xs text-gray-600">[{ev.status}]</span></div>
                    <div className="text-xs text-gray-600 mt-0.5">{new Date(ev.startDate).toLocaleString()} → {new Date(ev.endDate).toLocaleString()}</div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {ev.status === 'DRAFT' && (
                        <button onClick={() => submitEvent(ev.id)} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded">Submit</button>
                      )}
                      {user?.globalRole === 'ADMIN' && ev.status === 'SUBMITTED' && (
                        <>
                          <button onClick={() => reviewEvent(ev.id, true)} className="text-sm bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                          <button onClick={() => reviewEvent(ev.id, false)} className="text-sm bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                        </>
                      )}
                      {(ev.status === 'APPROVED') && (
                        <button onClick={() => publishEvent(ev.id)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Publish</button>
                      )}
                      {(isAdmin || ev.createdById === user?.id) && (
                        <button onClick={() => openRegistrationsModal(ev)} className="text-sm bg-gray-700 text-white px-3 py-1 rounded">View Registrations</button>
                      )}
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded border">
                      <div className="text-sm font-medium mb-2">Request Booking</div>
                      <div className="grid sm:grid-cols-3 gap-2 items-center">
                        <select className="border p-2 w-full rounded" value={(bookingInputs[ev.id]?.resourceId)||''} onChange={e=>changeBookingInput(ev.id,'resourceId',e.target.value)}>
                          <option value="">Select resource</option>
                          {resources.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                          ))}
                        </select>
                        <input className="border p-2 rounded" placeholder="Start ISO" value={(bookingInputs[ev.id]?.startTime)||''} onChange={e=>changeBookingInput(ev.id,'startTime',e.target.value)} />
                        <input className="border p-2 rounded" placeholder="End ISO" value={(bookingInputs[ev.id]?.endTime)||''} onChange={e=>changeBookingInput(ev.id,'endTime',e.target.value)} />
                      </div>
                      <button className="mt-2 text-sm bg-teal-600 text-white px-3 py-1 rounded" onClick={()=>requestBooking(ev.id)}>Request</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {modalEvent && (
        <EventRegistrationModal
          event={modalEvent}
          isRegistered={isRegistered(modalEvent.id)}
          onClose={() => setModalEvent(null)}
          onConfirm={async (info) => {
            if (isRegistered(modalEvent.id)) {
              await unregister(modalEvent.id);
            } else {
              await register(modalEvent.id, info);
            }
            setModalEvent(null);
          }}
        />
      )}

      {registrationsModal.event && (
        <RegistrationsModal
          event={registrationsModal.event}
          list={registrationsModal.list}
          onClose={() => setRegistrationsModal({ event: null, list: [] })}
        />
      )}
    </div>
  );
}

function EventRegistrationModal({ event, isRegistered, onClose, onConfirm }) {
  const [department, setDepartment] = React.useState('');
  const [academicYear, setAcademicYear] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const handleConfirm = () => {
    if (!isRegistered) {
      if (!department.trim() || !academicYear.trim()) {
        setFormError('Please fill Department and Academic Year before registering.');
        return;
      }
      setFormError('');
      onConfirm({ department: department.trim(), academicYear: academicYear.trim() });
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded border shadow p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{event.title}</div>
            <div className="text-xs text-gray-600 mt-1">
              {new Date(event.startDate).toLocaleString()} → {new Date(event.endDate).toLocaleString()}
            </div>
          </div>
          <button className="text-sm text-gray-600" onClick={onClose}>Close</button>
        </div>

        {event.description && (
          <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
            {event.description}
          </div>
        )}

        <div className="mt-4 bg-gray-50 border rounded p-3 text-sm">
          <div className="font-medium mb-1">Registration</div>
          <div className="text-gray-700">
            {isRegistered ? 'You are currently registered for this event.' : 'Fill your details below to register.'}
          </div>
          {!isRegistered && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Department *</label>
                <input
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Academic Year *</label>
                <input
                  className="border rounded w-full px-2 py-1 text-sm"
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="e.g. 3rd Year"
                />
              </div>
            </div>
          )}
          {formError && <div className="mt-2 text-xs text-red-600">{formError}</div>}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button className="px-3 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button
            className={`px-3 py-2 rounded text-white ${isRegistered ? 'bg-red-600' : 'bg-green-600'}`}
            onClick={handleConfirm}
          >
            {isRegistered ? 'Confirm Unregister' : 'Confirm Register'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistrationsModal({ event, list, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-xl rounded border shadow p-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="text-lg font-semibold">Registrations – {event.title}</div>
            <div className="text-xs text-gray-600 mt-1">
              {new Date(event.startDate).toLocaleString()} → {new Date(event.endDate).toLocaleString()}
            </div>
          </div>
          <button className="text-sm text-gray-600" onClick={onClose}>Close</button>
        </div>
        <div className="text-xs text-gray-600 mb-2">
          Total registrations: <span className="font-semibold">{list.length}</span>
        </div>
        <div className="max-h-72 overflow-y-auto border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-semibold text-gray-600">Name</th>
                <th className="px-2 py-1 text-left font-semibold text-gray-600">Email</th>
                <th className="px-2 py-1 text-left font-semibold text-gray-600">Department</th>
                <th className="px-2 py-1 text-left font-semibold text-gray-600">Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1">{r.user?.name || '-'}</td>
                  <td className="px-2 py-1">{r.user?.email || '-'}</td>
                  <td className="px-2 py-1">{r.user?.department || '-'}</td>
                  <td className="px-2 py-1">{r.user?.academicYear || '-'}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-gray-600" colSpan={4}>No registrations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
