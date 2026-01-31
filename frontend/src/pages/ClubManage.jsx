import React from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }
function useUser() {
  const t = useToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1]));
    return { id: p.id, email: p.email, globalRole: p.globalRole };
  } catch {
    return null;
  }
}

export default function ClubManage() {
  const { id } = useParams();
  const token = useToken();
  const user = useUser();
  const [members, setMembers] = React.useState([]);
  const [roleRequests, setRoleRequests] = React.useState([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [membersRes, requestsRes] = await Promise.all([
        api.get(`/clubs/${id}/members`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/clubs/${id}/role-requests`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setMembers(membersRes.data || []);
      setRoleRequests(requestsRes.data || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (token && id) load();
  }, [token, id]);

  const me = members.find(m => m.userId === user?.id);
  const canManage = user?.globalRole === 'ADMIN' || me?.clubRole === 'HEAD';

  const updateRole = async (membershipId, clubRole) => {
    setError('');
    try {
      await api.patch(
        `/clubs/${id}/members/${membershipId}/role`,
        { clubRole },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setMembers(prev => prev.map(m => (m.id === membershipId ? { ...m, clubRole } : m)));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update role');
    }
  };

  if (!token) return <div className="card p-6 text-center text-gray-600">Please log in.</div>;

  return (
    <div>
      <h2 className="page-title">Manage Club Members</h2>
      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-4">Loading…</div>}
      {!loading && !canManage && (
        <div className="card p-4 text-sm text-gray-700 mb-4 shadow-card bg-amber-50 border-amber-200">
          You must be this club&apos;s head or an admin to change roles. You can still view the roster.
        </div>
      )}

      {!loading && canManage && roleRequests.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-card">
          <h3 className="font-semibold text-amber-900 mb-2">Pending role requests</h3>
          <ul className="space-y-3">
            {roleRequests.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-white border border-amber-100">
                <span className="text-gray-700">{r.user?.name || r.user?.email || '—'} requested <strong>{r.requestedRole}</strong></span>
                <div className="flex gap-2">
                  <button
                    className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
                    onClick={async () => {
                      try {
                        await api.patch(`/clubs/${id}/role-requests/${r.id}`, { approve: true }, { headers: { Authorization: `Bearer ${token}` } });
                        load();
                      } catch (e) { setError(e.response?.data?.error || 'Failed'); }
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                    onClick={async () => {
                      try {
                        await api.patch(`/clubs/${id}/role-requests/${r.id}`, { approve: false }, { headers: { Authorization: `Bearer ${token}` } });
                        load();
                      } catch (e) { setError(e.response?.data?.error || 'Failed'); }
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && (
        <div className="card overflow-x-auto shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Email</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.user?.name || '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{m.user?.email || '-'}</td>
                  <td className="px-3 py-2">
                    {canManage && m.userId !== user?.id ? (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={m.clubRole}
                        onChange={e => updateRole(m.id, e.target.value)}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ORGANIZER">Organizer</option>
                        <option value="HEAD">Head</option>
                      </select>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 border">
                        {m.clubRole}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-sm text-gray-600" colSpan={3}>
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

