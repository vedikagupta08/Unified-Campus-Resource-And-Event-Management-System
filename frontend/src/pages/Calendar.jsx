import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Calendar() {
  const token = useToken();
  const [regs, setRegs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function load() {
      if (!token) return;
      setError('');
      setLoading(true);
      try {
        const { data } = await api.get('/registrations/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRegs(data || []);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load registrations');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (!token) return <div className="card p-6 text-center text-gray-600">Please log in to see your calendar.</div>;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = new Map();
  for (const r of regs) {
    if (!r.event) continue;
    const d = new Date(r.event.startDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day).push(r.event);
    }
  }

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <h2 className="page-title">My Event Calendar</h2>
      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}

      <div className="mb-4 text-sm text-gray-700">
        Showing registrations for <span className="font-semibold text-gray-900">{now.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>.
      </div>

      <div className="card overflow-hidden mb-4 shadow-card">
        <div className="grid grid-cols-7 bg-gray-50 text-xs font-semibold text-gray-600">
          {weekdayLabels.map(d => (
            <div key={d} className="px-2 py-1 text-center border-b border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, idx) => (
          <div key={idx} className="grid grid-cols-7 text-xs">
            {week.map((day, i) => (
              <div
                key={i}
                className="min-h-[70px] border-r border-b last:border-r-0 px-1 py-1 align-top"
              >
                {day && (
                  <>
                    <div className="text-[11px] font-semibold mb-1">{day}</div>
                    {(eventsByDay.get(day) || []).map(ev => (
                      <div
                        key={ev.id}
                        className="mb-1 rounded bg-blue-50 border border-blue-200 px-1 py-[2px] text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {ev.title}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600">
        Only events you are registered for and that start in this month are shown in the calendar.
      </div>
    </div>
  );
}

