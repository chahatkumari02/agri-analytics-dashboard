import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSocket } from './hooks/useSocket';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import AgronomistDashboard from './pages/agronomist/AgronomistDashboard';
import SupplyChainDashboard from './pages/supply/SupplyChainDashboard';
import MarketDashboard from './pages/market/MarketDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function AppRoutes() {
  useSocket(); // establish WebSocket once per session
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Farmer */}
      <Route element={<ProtectedRoute allowedRoles={['FARMER']} />}>
        <Route element={<AppShell><FarmerDashboard /></AppShell>} path="/farmer" />
        <Route element={<AppShell><FarmerDashboard /></AppShell>} path="/farmer/fields" />
        <Route element={<AppShell><FarmerDashboard /></AppShell>} path="/farmer/alerts" />
      </Route>

      {/* Agronomist */}
      <Route element={<ProtectedRoute allowedRoles={['AGRONOMIST']} />}>
        <Route element={<AppShell><AgronomistDashboard /></AppShell>} path="/agronomist" />
        <Route element={<AppShell><AgronomistDashboard /></AppShell>} path="/agronomist/soil" />
        <Route element={<AppShell><AgronomistDashboard /></AppShell>} path="/agronomist/crops" />
        <Route element={<AppShell><AgronomistDashboard /></AppShell>} path="/agronomist/livestock" />
      </Route>

      {/* Supply Chain */}
      <Route element={<ProtectedRoute allowedRoles={['SUPPLY_CHAIN']} />}>
        <Route element={<AppShell><SupplyChainDashboard /></AppShell>} path="/supply" />
        <Route element={<AppShell><SupplyChainDashboard /></AppShell>} path="/supply/forecast" />
        <Route element={<AppShell><SupplyChainDashboard /></AppShell>} path="/supply/inventory" />
        <Route element={<AppShell><SupplyChainDashboard /></AppShell>} path="/supply/events" />
      </Route>

      {/* Market Analyst */}
      <Route element={<ProtectedRoute allowedRoles={['MARKET_ANALYST']} />}>
        <Route element={<AppShell><MarketDashboard /></AppShell>} path="/market" />
        <Route element={<AppShell><MarketDashboard /></AppShell>} path="/market/history" />
        <Route element={<AppShell><MarketDashboard /></AppShell>} path="/market/regional" />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AppShell><AdminDashboard /></AppShell>} path="/admin" />
        <Route element={<AppShell><AdminDashboard /></AppShell>} path="/admin/health" />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
