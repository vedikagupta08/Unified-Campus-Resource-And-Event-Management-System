import React from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError.js';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL + '/api' });
function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.globalRole;
  } catch {
    return null;
  }
}

export default function Login() {
  const [email, setEmail] = React.useState('admin@campus.local');
  const [password, setPassword] = React.useState('admin123');
  const [error, setError] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      const role = decodeRole(data.token);
      window.location.href = role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-100 to-gray-50 px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4 shadow-cardHover">
        <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
        {error && <div className="alert-error">{error}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="input-field" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="input-field" />
        <button type="submit" className="btn-primary w-full">Login</button>
      </form>
    </div>
  );
}
