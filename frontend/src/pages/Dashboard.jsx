import React from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function useToken() { return localStorage.getItem('token'); }

export default function Dashboard() {
  const [summary, setSummary] = React.useState(null);
  const token = useToken();

  React.useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/analytics/summary', { headers: { Authorization: `Bearer ${token}` } });
        setSummary(data);
      } catch {}
    }
    if (token) load();
  }, [token]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admin Summary</h2>
      {!summary ? <div className="text-gray-500">No data or insufficient permissions.</div> : (
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">{JSON.stringify(summary, null, 2)}</pre>
      )}
    </div>
  );
}
