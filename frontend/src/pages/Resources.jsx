import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Resources() {
  const [resources, setResources] = React.useState([]);
  const [name, setName] = React.useState('Auditorium');
  const [type, setType] = React.useState('HALL');
  const [requiresApproval, setRequiresApproval] = React.useState(true);
  const [autoApprove, setAutoApprove] = React.useState(false);
  const [capacity, setCapacity] = React.useState('');
  const token = useToken();

  const load = async () => {
    const { data } = await api.get('/resources', { headers: { Authorization: `Bearer ${token}` } });
    setResources(data);
  };
  React.useEffect(() => { if (token) load(); }, [token]);

  const createResource = async () => {
    try {
      const body = { name, type, requiresApproval, autoApprove, capacity: capacity ? Number(capacity) : undefined };
      await api.post('/resources', body, { headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold mb-2">Resources</h3>
        <ul className="space-y-2">
          {resources.map(r => (
            <li key={r.id} className="bg-white p-3 rounded border flex justify-between">
              <span>{r.name}</span>
              <span className="text-xs text-gray-600">{r.type}{r.capacity ? ` • ${r.capacity}` : ''}{r.requiresApproval ? ' • approval' : ' • auto'}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Create Resource (Admin)</h3>
        <div className="bg-white p-3 rounded border space-y-2">
          <input className="border p-2 w-full" value={name} onChange={e=>setName(e.target.value)} />
          <select className="border p-2 w-full" value={type} onChange={e=>setType(e.target.value)}>
            <option>ROOM</option>
            <option>HALL</option>
            <option>LAB</option>
            <option>EQUIPMENT</option>
          </select>
          <div className="flex items-center gap-3 text-sm">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={requiresApproval} onChange={e=>setRequiresApproval(e.target.checked)} /> requiresApproval
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={autoApprove} onChange={e=>setAutoApprove(e.target.checked)} /> autoApprove
            </label>
            <input className="border p-1 w-24" placeholder="capacity" value={capacity} onChange={e=>setCapacity(e.target.value)} />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createResource}>Create</button>
        </div>
      </div>
    </div>
  );
}
