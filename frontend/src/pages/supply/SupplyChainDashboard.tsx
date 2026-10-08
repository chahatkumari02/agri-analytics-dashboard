import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../../api/axios';
import Papa from 'papaparse';

const EVENT_COLORS: Record<string, string> = {
  HARVESTED: 'bg-green-100 text-green-700',
  TRANSPORTED: 'bg-blue-100 text-blue-700',
  STORED: 'bg-amber-100 text-amber-700',
  SOLD: 'bg-purple-100 text-purple-700',
};

function exportCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SupplyChainDashboard() {
  const [eventFilter, setEventFilter] = useState('');

  const { data: summary = {} } = useQuery({ queryKey: ['sc-summary'], queryFn: () => axios.get('/supply-chain/summary').then(r => r.data) });
  const { data: events = [] } = useQuery({ queryKey: ['sc-events'], queryFn: () => axios.get('/supply-chain/events?limit=200').then(r => r.data) });
  const { data: forecast = [] } = useQuery({ queryKey: ['sc-forecast'], queryFn: () => axios.get('/supply-chain/harvest-forecast').then(r => r.data) });

  const filteredEvents = eventFilter ? events.filter((e: any) => e.event_type === eventFilter) : events;

  // Inventory over time — aggregate STORED events by month
  const inventoryMap: Record<string, Record<string, number>> = {};
  events.filter((e: any) => e.event_type === 'STORED').forEach((e: any) => {
    const month = e.event_time.slice(0, 7);
    if (!inventoryMap[month]) inventoryMap[month] = {};
    inventoryMap[month][e.commodity] = (inventoryMap[month][e.commodity] || 0) + e.quantity_kg;
  });
  const inventoryData = Object.entries(inventoryMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({ month, ...vals }));

  const KPI_LABELS: Record<string, string> = { HARVESTED: '🌾 Harvested', TRANSPORTED: '🚛 In Transit', STORED: '🏭 Stored', SOLD: '💰 Sold' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🚛 Supply Chain Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(KPI_LABELS).map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">
              {((summary as any)[key] || 0).toLocaleString()} <span className="text-sm font-normal text-gray-400">kg</span>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Storage Inventory by Commodity (kg)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={inventoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {['wheat', 'maize', 'soybean', 'rice'].map((c, i) => (
              <Area key={c} type="monotone" dataKey={c} stackId="1" fill={['#86efac','#93c5fd','#fde68a','#c4b5fd'][i]} stroke={['#22c55e','#3b82f6','#f59e0b','#8b5cf6'][i]} strokeWidth={1.5} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Harvest Forecast */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Upcoming Harvest Forecast</h2>
          <button onClick={() => exportCSV(forecast, 'harvest-forecast.csv')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Crop</th><th className="pb-2">Harvest Date</th><th className="pb-2">Days Until</th>
              <th className="pb-2">Est. Yield (kg)</th><th className="pb-2">Stage</th>
            </tr></thead>
            <tbody>
              {forecast.map((f: any) => (
                <tr key={f.crop_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{f.crop_name}</td>
                  <td className="py-2">{new Date(f.harvest_date).toLocaleDateString()}</td>
                  <td className="py-2">{f.days_until_harvest} days</td>
                  <td className="py-2">{(f.expected_yield_kg || 0).toLocaleString()}</td>
                  <td className="py-2"><span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{f.growth_stage}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Supply Chain Event Log</h2>
          <div className="flex gap-2">
            <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} className="border rounded px-3 py-1 text-sm focus:outline-none">
              <option value="">All Events</option>
              {['HARVESTED','TRANSPORTED','STORED','SOLD'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => exportCSV(filteredEvents, 'supply-chain-events.csv')} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Event</th><th className="pb-2">Commodity</th><th className="pb-2">Qty (kg)</th>
              <th className="pb-2">Location</th><th className="pb-2">Time</th>
            </tr></thead>
            <tbody>
              {filteredEvents.slice(0, 50).map((e: any) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[e.event_type] || 'bg-gray-100'}`}>{e.event_type}</span></td>
                  <td className="py-2">{e.commodity}</td>
                  <td className="py-2">{e.quantity_kg.toLocaleString()}</td>
                  <td className="py-2">{e.location}</td>
                  <td className="py-2 text-gray-400">{new Date(e.event_time).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
