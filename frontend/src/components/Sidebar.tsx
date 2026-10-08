import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Wheat, Bell, FlaskConical, BarChart2, Beef,
  TruckIcon, Package, ClipboardList, TrendingUp, LineChart, MapPin,
  Users, Activity
} from 'lucide-react';

const NAV: Record<string, { label: string; to: string; icon: React.ReactNode }[]> = {
  FARMER: [
    { label: 'Overview', to: '/farmer', icon: <LayoutDashboard size={18} /> },
    { label: 'Fields & Crops', to: '/farmer/fields', icon: <Wheat size={18} /> },
    { label: 'Alerts', to: '/farmer/alerts', icon: <Bell size={18} /> },
  ],
  AGRONOMIST: [
    { label: 'Overview', to: '/agronomist', icon: <LayoutDashboard size={18} /> },
    { label: 'Soil Analysis', to: '/agronomist/soil', icon: <FlaskConical size={18} /> },
    { label: 'Crop Analytics', to: '/agronomist/crops', icon: <BarChart2 size={18} /> },
    { label: 'Livestock', to: '/agronomist/livestock', icon: <Beef size={18} /> },
  ],
  SUPPLY_CHAIN: [
    { label: 'Overview', to: '/supply', icon: <LayoutDashboard size={18} /> },
    { label: 'Harvest Forecast', to: '/supply/forecast', icon: <TruckIcon size={18} /> },
    { label: 'Inventory', to: '/supply/inventory', icon: <Package size={18} /> },
    { label: 'Event Log', to: '/supply/events', icon: <ClipboardList size={18} /> },
  ],
  MARKET_ANALYST: [
    { label: 'Price Overview', to: '/market', icon: <TrendingUp size={18} /> },
    { label: 'Price History', to: '/market/history', icon: <LineChart size={18} /> },
    { label: 'Regional Prices', to: '/market/regional', icon: <MapPin size={18} /> },
  ],
  ADMIN: [
    { label: 'Users', to: '/admin', icon: <Users size={18} /> },
    { label: 'System Health', to: '/admin/health', icon: <Activity size={18} /> },
  ],
};

const ROLE_COLORS: Record<string, string> = {
  FARMER: 'bg-green-600',
  AGRONOMIST: 'bg-teal-600',
  SUPPLY_CHAIN: 'bg-orange-500',
  MARKET_ANALYST: 'bg-purple-600',
  ADMIN: 'bg-red-600',
};

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const links = NAV[user.role] || [];

  return (
    <div className="w-56 bg-gray-900 text-gray-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <span className="font-bold text-sm leading-tight">AgriAnalytics<br />Dashboard</span>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-4 py-2 border-b border-gray-700">
        <span className={`text-xs px-2 py-1 rounded-full text-white ${ROLE_COLORS[user.role] || 'bg-gray-600'}`}>
          {user.role.replace('_', ' ')}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
