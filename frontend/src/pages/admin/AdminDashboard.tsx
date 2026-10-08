import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Database, Users, CheckCircle, XCircle } from 'lucide-react';
import axios from '../../api/axios';

const ROLES = ['FARMER', 'AGRONOMIST', 'SUPPLY_CHAIN', 'MARKET_ANALYST', 'ADMIN'];
const ROLE_COLORS: Record<string, string> = {
  FARMER: 'bg-green-100 text-green-700', AGRONOMIST: 'bg-teal-100 text-teal-700',
  SUPPLY_CHAIN: 'bg-orange-100 text-orange-700', MARKET_ANALYST: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<'users' | 'health'>('users');
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: () => axios.get('/admin/users').then(r => r.data) });
  const { data: health } = useQuery({ queryKey: ['admin-health'], queryFn: () => axios.get('/admin/health').then(r => r.data), refetchInterval: 10000 });

  const updateUser = useMutation({
    mutationFn: ({ id, role, is_active }: any) => axios.patch(`/admin/users/${id}`, null, { params: { role, is_active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">⚙️ Admin Dashboard</h1>

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['users', 'health'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'users' ? '👥 Users' : '🩺 System Health'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><Users size={18} /> User Management ({users.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th><th className="pb-2">Email</th><th className="pb-2">Role</th>
                <th className="pb-2">Status</th><th className="pb-2">Actions</th>
              </tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{u.name}</td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={e => updateUser.mutate({ id: u.id, role: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium focus:outline-none cursor-pointer ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                    <td className="py-3">
                      <span className={`flex items-center gap-1 text-xs ${u.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        {u.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => updateUser.mutate({ id: u.id, is_active: !u.is_active })}
                        className={`text-xs px-3 py-1 rounded-lg transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'health' && health && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Database size={16} /> Database</div>
              <div className={`flex items-center gap-2 font-semibold ${health.db === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                {health.db === 'ok' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {health.db === 'ok' ? 'Connected' : 'Error'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Activity size={16} /> Simulator</div>
              <div className={`flex items-center gap-2 font-semibold ${health.simulator_running ? 'text-green-600' : 'text-amber-600'}`}>
                {health.simulator_running ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {health.simulator_running ? 'Running' : 'Stopped'}
              </div>
              {health.last_sensor_write_at && (
                <div className="text-xs text-gray-400 mt-1">Last write: {new Date(health.last_sensor_write_at).toLocaleTimeString()}</div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><Users size={16} /> Users</div>
              <div className="text-2xl font-bold text-gray-800">{health.record_counts?.users ?? '—'}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Record Counts</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(health.record_counts || {}).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{k.replace('_', ' ')}</div>
                  <div className="text-xl font-bold text-gray-800">{(v as number).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
