import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  FARMER: 'bg-green-100 text-green-800',
  AGRONOMIST: 'bg-teal-100 text-teal-800',
  SUPPLY_CHAIN: 'bg-orange-100 text-orange-800',
  MARKET_ANALYST: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-red-100 text-red-800',
};

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
      <div className="text-gray-500 text-sm">
        Agriculture Production Analytics Dashboard
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
          {user.role.replace('_', ' ')}
        </span>
        <span className="text-sm font-medium text-gray-700">{user.name}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
