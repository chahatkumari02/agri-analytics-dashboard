import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const DEMO_USERS = [
  { email: 'farmer@demo.com', role: 'Farmer', color: 'bg-green-500' },
  { email: 'agronomist@demo.com', role: 'Agronomist', color: 'bg-teal-500' },
  { email: 'supply@demo.com', role: 'Supply Chain', color: 'bg-orange-500' },
  { email: 'market@demo.com', role: 'Market Analyst', color: 'bg-purple-500' },
  { email: 'admin@demo.com', role: 'Admin', color: 'bg-red-500' },
];

const ROLE_REDIRECTS: Record<string, string> = {
  FARMER: '/farmer',
  AGRONOMIST: '/agronomist',
  SUPPLY_CHAIN: '/supply',
  MARKET_ANALYST: '/market',
  ADMIN: '/admin',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const role = useAuthStore.getState().user?.role;
      navigate(ROLE_REDIRECTS[role || ''] || '/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (demoEmail: string) => {
    setLoading(true);
    setError('');
    try {
      await login(demoEmail, 'demo1234');
      const role = useAuthStore.getState().user?.role;
      navigate(ROLE_REDIRECTS[role || ''] || '/');
    } catch {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌾</div>
          <h1 className="text-2xl font-bold text-gray-800">AgriAnalytics Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Agriculture Production Analytics Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="email@demo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="demo1234"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-xs text-gray-400 text-center mb-3">— Quick demo logins —</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => handleDemo(u.email)}
                  disabled={loading}
                  className={`text-xs text-white py-2 px-3 rounded-lg ${u.color} hover:opacity-90 transition-opacity disabled:opacity-50`}
                >
                  {u.role}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">All demo passwords: <code className="bg-gray-100 px-1 rounded">demo1234</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
