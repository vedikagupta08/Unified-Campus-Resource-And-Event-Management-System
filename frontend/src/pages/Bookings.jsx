import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { isAdmin: p.isAdmin }; } catch { return null; }
}

export default function Bookings() {
  const token = useToken();
  const user = useUser();
  const [tab, setTab] = React.useState('pending'); // 'pending' | 'approved' | 'rejected'
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = async (which = tab) => {
    setError('');
    setLoading(true);
    try {
      const path = which === 'approved' ? '/bookings/approved' : which === 'rejected' ? '/bookings/rejected' : '/bookings/pending';
      const { data } = await api.get(path, { headers: { Authorization: `Bearer ${token}` } });
      setItems(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { if (token) load('pending'); }, [token]);
  React.useEffect(() => { if (token) load(tab); }, [tab]);

  const review = async (id, approve) => {
    try {
      await api.post(`/bookings/${id}/review`, { approve }, { headers: { Authorization: `Bearer ${token}` } });
      // remove item from current list
      setItems(prev => prev.filter(b => b.id !== id));
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  if (!user?.isAdmin) return <div>Admin only.</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pending Bookings</h2>
      <div className="mb-3 flex gap-2">
        <button onClick={() => setTab('pending')} className={`px-3 py-1 rounded ${tab==='pending'?'bg-blue-600 text-white':'bg-gray-200'}`}>Pending</button>
        <button onClick={() => setTab('approved')} className={`px-3 py-1 rounded ${tab==='approved'?'bg-blue-600 text-white':'bg-gray-200'}`}>Approved</button>
        <button onClick={() => setTab('rejected')} className={`px-3 py-1 rounded ${tab==='rejected'?'bg-blue-600 text-white':'bg-gray-200'}`}>Rejected</button>
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {loading ? <div className="text-sm text-gray-600">Loading…</div> : (
        <>
          <ul className="space-y-2">
            {items.map(b => (
              <li key={b.id} className="bg-white p-3 rounded border">
                <div className="font-medium">{b.resource?.name} — {b.event?.title}</div>
                <div className="text-xs text-gray-600">{new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</div>
                {tab==='pending' && (
                  <div className="mt-2 flex gap-2">
                    <button className="text-sm bg-green-600 text-white px-3 py-1 rounded" onClick={() => review(b.id, true)}>Approve</button>
                    <button className="text-sm bg-red-600 text-white px-3 py-1 rounded" onClick={() => review(b.id, false)}>Reject</button>
                  </div>
                )}
                {tab!=='pending' && (
                  <div className="mt-2 text-xs">Status: {tab}</div>
                )}
              </li>
            ))}
          </ul>
          {items.length === 0 && <div className="text-sm text-gray-600">No {tab} items.</div>}
        </>
      )}
    </div>
  );
}
