import React from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Dashboard() {
  const [data, setData] = React.useState(null); // { eventsPerClub, bookingsPerResource, participationByMonth, totals }
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const token = useToken();

  const fetchData = React.useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/analytics/summary', { headers: { Authorization: `Bearer ${token}` }, params });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token, from, to]);

  React.useEffect(() => { if (token) fetchData(); }, [token]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input type="date" className="border rounded px-2 py-1" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input type="date" className="border rounded px-2 py-1" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={fetchData}>Apply</button>
      </div>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {loading && <div className="text-gray-500">Loading analytics…</div>}
      {!loading && data && (
        <div className="space-y-8">
          <div>
            <h3 className="font-medium mb-2">Totals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Bookings" value={data.totals?.totalBookings || 0} />
              <Stat label="Registrations" value={data.totals?.totalRegistrations || 0} />
              <Stat label="Clubs" value={data.totals?.totalClubs || 0} />
              <Stat label="Resources" value={data.totals?.totalResources || 0} />
            </div>
          </div>

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
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function ChartCard({ title, onExport, children }) {
  return (
    <div className="bg-white rounded border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{title}</h3>
        <button className="text-sm px-3 py-1 bg-gray-800 text-white rounded" onClick={onExport}>Export CSV</button>
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
