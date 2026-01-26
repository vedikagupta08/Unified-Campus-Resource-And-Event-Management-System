import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { isAdmin: p.isAdmin }; } catch { return null; }
}

export default function Resources() {
  const token = useToken();
  const user = useUser();
  const [resources, setResources] = React.useState([]);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', type: 'ROOM', requiresApproval: true, autoApprove: false, capacity: '' });

  const load = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.get('/resources', { headers: { Authorization: `Bearer ${token}` } });
      setResources(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { if (token) load(); }, [token]);

  const create = async () => {
    setError('');
    setSuccess('');
    try {
      const payload = { ...form, capacity: form.capacity ? Number(form.capacity) : null };
      await api.post('/resources', payload, { headers: { Authorization: `Bearer ${token}` } });
      setShowCreate(false);
      setForm({ name: '', type: 'ROOM', requiresApproval: true, autoApprove: false, capacity: '' });
      load();
      setSuccess('Resource created');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create resource');
    }
  };

  if (!user?.isAdmin) return <div>Admin only.</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Resources</h2>
      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-3">{success}</div>}
      {loading && <div className="text-gray-500 mb-3">Loading…</div>}
      {!loading && (
        <>
          {!showCreate ? (
            <button className="mb-3 px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setShowCreate(true)}>Add Resource</button>
          ) : (
            <div className="bg-white p-3 rounded border mb-3 space-y-2">
              <input className="border p-2 w-full" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <select className="border p-2 w-full" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ROOM">Room</option>
                <option value="HALL">Hall</option>
                <option value="LAB">Lab</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
              <input className="border p-2 w-full" type="number" placeholder="Capacity (optional)" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} />
                Requires Approval
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.autoApprove} onChange={e => setForm(f => ({ ...f, autoApprove: e.target.checked }))} />
                Auto Approve
              </label>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={create}>Create</button>
                <button className="px-3 py-2 bg-gray-600 text-white rounded" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}
          <ul className="space-y-2">
            {resources.map(r => (
              <li key={r.id} className="bg-white p-3 rounded border">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-600">
                  Type: {r.type}
                  {r.capacity && ` • Capacity: ${r.capacity}`}
                  {r.requiresApproval ? ' • Requires Approval' : ' • No Approval Required'}
                  {r.autoApprove ? ' • Auto Approve' : ''}
                </div>
              </li>
            ))}
          </ul>
          {resources.length === 0 && <div className="text-sm text-gray-600">No resources found.</div>}
        </>
      )}
    </div>
  );
}
