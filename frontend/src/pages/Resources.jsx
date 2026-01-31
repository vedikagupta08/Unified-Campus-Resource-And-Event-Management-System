import React from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });

function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try { const p = JSON.parse(atob(t.split('.')[1])); return { globalRole: p.globalRole }; } catch { return null; }
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
      setError(apiErrorMessage(e, 'Failed to load resources'));
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
      setError(apiErrorMessage(e, 'Failed to create resource'));
    }
  };

  if (!user?.globalRole || user.globalRole !== 'ADMIN') return <div>Admin only.</div>;

  return (
    <div>
      <h2 className="page-title">Resources</h2>
      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}
      {loading && <LoadingSpinner label="Loading resources…" />}
      {!loading && (
        <>
          {!showCreate ? (
            <button className="mb-4 btn-primary" onClick={() => setShowCreate(true)}>Add Resource</button>
          ) : (
            <div className="card p-4 mb-4 space-y-3 shadow-card">
              <input className="input-field" placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="ROOM">Room</option>
                <option value="HALL">Hall</option>
                <option value="LAB">Lab</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
              <input className="input-field" type="number" placeholder="Capacity (optional)" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.requiresApproval} onChange={e => setForm(f => ({ ...f, requiresApproval: e.target.checked }))} className="rounded border-gray-300" />
                Requires Approval
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 ml-4">
                <input type="checkbox" checked={form.autoApprove} onChange={e => setForm(f => ({ ...f, autoApprove: e.target.checked }))} className="rounded border-gray-300" />
                Auto Approve
              </label>
              <div className="flex gap-2">
                <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={create}>Create</button>
                <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </div>
          )}
          {resources.length === 0 ? (
            <EmptyState icon="resources" title="No resources yet" subtitle="Add your first resource to get started." />
          ) : (
          <ul className="space-y-3">
            {resources.map(r => (
              <li key={r.id} className={`card p-4 shadow-card ${r.active === false ? 'opacity-60 border-gray-300' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{r.name}</div>
                  {r.active === false && <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">Inactive</span>}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Type: {r.type}
                  {r.capacity && ` • Capacity: ${r.capacity}`}
                  {r.requiresApproval ? ' • Requires Approval' : ' • No Approval Required'}
                  {r.autoApprove ? ' • Auto Approve' : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Usage summary: Used {r.usageLast30Days ?? 0} times in the last 30 days
                </div>
                <div className="mt-2 flex gap-2">
                  {r.active !== false ? (
                    <button
                      className="text-sm bg-amber-600 text-white px-3 py-1 rounded"
                      onClick={async () => {
                        try {
                          await api.patch(`/resources/${r.id}`, { active: false }, { headers: { Authorization: `Bearer ${token}` } });
                          load();
                        } catch (e) { setError(apiErrorMessage(e, 'Failed to deactivate')); }
                      }}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      className="text-sm font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                      onClick={async () => {
                        try {
                          await api.patch(`/resources/${r.id}`, { active: true }, { headers: { Authorization: `Bearer ${token}` } });
                          load();
                        } catch (e) { setError(apiErrorMessage(e, 'Failed to activate')); }
                      }}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          )}
        </>
      )}
    </div>
  );
}
