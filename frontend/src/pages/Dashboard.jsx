import React from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiErrorMessage } from '../utils/apiError.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { globalRole: p.globalRole }; } catch { return null; }
}

export default function Dashboard() {
  const [data, setData] = React.useState(null);
  const [pending, setPending] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [audit, setAudit] = React.useState([]);
  const token = useToken();
  const user = useUser();

  if (!user || user.globalRole !== 'ADMIN') {
    return <div className="card p-6 text-center text-gray-600">Admin dashboard – admins only.</div>;
  }

  const fetchData = React.useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const [summaryRes, auditRes, pendingRes] = await Promise.all([
        api.get('/analytics/summary', { headers: { Authorization: `Bearer ${token}` }, params }),
        api.get('/audit/recent', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/analytics/pending-attention', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData(summaryRes.data);
      setAudit(auditRes.data || []);
      setPending(pendingRes.data || {});
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  }, [token, from, to]);

  React.useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  function deriveInsights(d) {
    const insights = [];
    const eventsPerClub = d?.eventsPerClub || [];
    const bookingsPerResource = d?.bookingsPerResource || [];
    const totalEvents = eventsPerClub.reduce((a, r) => a + (r.count || 0), 0);
    if (totalEvents > 0 && eventsPerClub.length > 0) {
      const top = eventsPerClub[0];
      const pct = Math.round((top.count / totalEvents) * 100);
      insights.push({ chart: 'eventsPerClub', text: `${top.clubName || 'One club'} accounts for ${pct}% of total events.` });
    }
    const totalBookings = bookingsPerResource.reduce((a, r) => a + (r.count || 0), 0);
    if (bookingsPerResource.length >= 2 && totalBookings > 0) {
      const sorted = [...bookingsPerResource].sort((a, b) => (b.count || 0) - (a.count || 0));
      const lowest = sorted[sorted.length - 1];
      const lowPct = Math.round((lowest.count / totalBookings) * 100);
      insights.push({ chart: 'bookingsPerResource', text: `${lowest.resourceName || 'Some resource'} usage is lower compared to others (${lowPct}% of bookings).` });
    }
    return insights;
  }

  return (
    <div>
      <h2 className="page-title">Analytics</h2>
      {error && <div className="alert-error">{error}</div>}

      {token && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-card">
          <h3 className="font-semibold text-amber-900 mb-2">Pending Attention</h3>
          <div className="flex flex-wrap gap-4 text-sm text-amber-800">
            <span>Pending event approvals: <strong>{pending?.pendingEventApprovals ?? '…'}</strong></span>
            <span>Pending resource bookings: <strong>{pending?.pendingBookings ?? '…'}</strong></span>
            <span>Clubs inactive 60+ days (no events): <strong>{pending?.clubsInactive60Days ?? '…'}</strong></span>
          </div>
          <p className="text-xs text-amber-700 mt-2">Address these items for smoother operations.</p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">From</label>
          <input type="date" className="input-field max-w-[160px]" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1 font-medium">To</label>
          <input type="date" className="input-field max-w-[160px]" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={fetchData}>Apply</button>
      </div>
      {loading && <LoadingSpinner label="Loading analytics…" />}
      {!loading && data && (
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Totals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Bookings" value={data.totals?.totalBookings || 0} />
              <Stat label="Registrations" value={data.totals?.totalRegistrations || 0} />
              <Stat label="Clubs" value={data.totals?.totalClubs || 0} />
              <Stat label="Resources" value={data.totals?.totalResources || 0} />
            </div>
          </div>

          {deriveInsights(data).filter(i => i.chart === 'eventsPerClub').length > 0 && (
            <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl p-3 shadow-card">
              <strong>Insight:</strong> {deriveInsights(data).find(i => i.chart === 'eventsPerClub')?.text}
            </div>
          )}
          <ChartCard title="Events per Club" onExport={() => exportCsv('events_per_club.csv', ['clubName','count'], data.eventsPerClub)}>
            {(!data.eventsPerClub || data.eventsPerClub.length === 0) ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.eventsPerClub} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="clubName" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<BarsTooltip total={sumCounts(data.eventsPerClub)} nameKey="clubName" />} />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {deriveInsights(data).filter(i => i.chart === 'bookingsPerResource').length > 0 && (
            <div className="text-sm text-gray-700 bg-green-50 border border-green-100 rounded-xl p-3 shadow-card">
              <strong>Insight:</strong> {deriveInsights(data).find(i => i.chart === 'bookingsPerResource')?.text}
            </div>
          )}
          <ChartCard title="Bookings per Resource" onExport={() => exportCsv('bookings_per_resource.csv', ['resourceName','count'], data.bookingsPerResource)}>
            {(!data.bookingsPerResource || data.bookingsPerResource.length === 0) ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.bookingsPerResource} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="resourceName" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<BarsTooltip total={sumCounts(data.bookingsPerResource)} nameKey="resourceName" />} />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Participation Trend (Registrations by Month)" onExport={() => exportCsv('registrations_by_month.csv', ['month','count'], data.participationByMonth)}>
            {(!data.participationByMonth || data.participationByMonth.length === 0) ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.participationByMonth} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div>
            <h3 className="font-medium mb-2">Recent Admin Actions</h3>
            <div className="bg-white rounded border overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">Time</th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">Who</th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">Action</th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">Entity</th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(audit || []).map(log => (
                    <tr key={log.id} className="border-t">
                      <td className="px-2 py-1">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-2 py-1">{log.user?.email || log.user?.name || '—'}</td>
                      <td className="px-2 py-1">{log.action}</td>
                      <td className="px-2 py-1">{log.entity} {log.entityId ? `(${String(log.entityId).slice(0, 8)}…)` : ''}</td>
                      <td className="px-2 py-1">
                        {log.metadata?.approve === true && 'Approved'}
                        {log.metadata?.approve === false && 'Rejected'}
                        {log.metadata?.reason && ` – ${log.metadata.reason}`}
                      </td>
                    </tr>
                  ))}
                  {(audit || []).length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-gray-600" colSpan={5}>No recent actions.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4 shadow-card">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function ChartCard({ title, onExport, children }) {
  return (
    <div className="card p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button className="text-sm px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium" onClick={onExport}>Export CSV</button>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-gray-500">No data to display.</div>;
}

function sumCounts(rows) {
  return (rows || []).reduce((acc, r) => acc + (r.count || 0), 0);
}

function BarsTooltip({ active, payload, label, total, nameKey }) {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload;
    const count = item?.count || 0;
    const pct = total ? ((count / total) * 100).toFixed(1) : '0.0';
    const name = item?.[nameKey] || label;
    return (
      <div className="bg-white border rounded p-2 text-sm">
        <div className="font-medium">{name}</div>
        <div>{count} ({pct}%)</div>
      </div>
    );
  }
  return null;
}

function exportCsv(filename, headers, rows) {
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map(h => escapeCsv(String(row[h] ?? ''))).join(',');
    csvRows.push(line);
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replaceAll('"', '""') + '"';
  }
  return value;
}
