import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from '../../api/axios';

const METRICS = ['soil_moisture', 'temperature', 'humidity'];
const METRIC_LABELS: Record<string, string> = { soil_moisture: 'Soil Moisture (%)', temperature: 'Temperature (°C)', humidity: 'Humidity (%)' };
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export default function AgronomistDashboard() {
  const [selectedMetric, setSelectedMetric] = useState('soil_moisture');
  const [days, setDays] = useState(30);
  const { from, to } = getDateRange(days);

  const { data: farms = [] } = useQuery({ queryKey: ['farms'], queryFn: () => axios.get('/farms').then(r => r.data) });
  const { data: allFields = [] } = useQuery({ queryKey: ['all-fields'], queryFn: async () => {
    const farmsData = await axios.get('/farms').then(r => r.data);
    const fieldArrays = await Promise.all(farmsData.map((f: any) => axios.get(`/farms/${f.id}/fields`).then(r => r.data)));
    return fieldArrays.flat();
  }});
  const { data: crops = [] } = useQuery({ queryKey: ['all-crops'], queryFn: () => axios.get('/crops').then(r => r.data) });
  const { data: livestock = [] } = useQuery({ queryKey: ['livestock'], queryFn: () => axios.get('/livestock').then(r => r.data) });
  const { data: sensorLatest = [] } = useQuery({ queryKey: ['sensor-latest-all'], queryFn: () => axios.get('/sensors/latest').then(r => r.data) });

  // Sensor trend data (sample across all fields)
  const { data: trendRaw = [] } = useQuery({
    queryKey: ['trend', selectedMetric, days],
    queryFn: () => axios.get(`/sensors/readings?metric_type=${selectedMetric}&from_date=${from}&to_date=${to}&limit=500`).then(r => r.data),
  });

  // Group trend by date
  const trendByDate: Record<string, any> = {};
  trendRaw.forEach((r: any) => {
    const date = r.recorded_at.split('T')[0];
    if (!trendByDate[date]) trendByDate[date] = { date };
    const key = `F${r.field_id}`;
    if (!trendByDate[date][key]) {
      trendByDate[date][key] = r.value;
    }
  });
  const trendData = Object.values(trendByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  const fieldKeys = [...new Set(trendRaw.map((r: any) => `F${r.field_id}`))].slice(0, 6) as string[];

  // Yield comparison
  const yieldData = allFields.slice(0, 10).map((f: any) => {
    const crop = crops.find((c: any) => c.field_id === f.id);
    return {
      name: f.name.split(' - ')[0],
      Expected: crop?.expected_yield_kg || 0,
      Actual: crop?.actual_yield_kg || 0,
    };
  });

  // Health table
  const healthTable = allFields.map((f: any) => {
    const latest = sensorLatest.find((s: any) => s.field_id === f.id);
    const moisture = latest?.soil_moisture;
    const temp = latest?.temperature;
    const status = moisture < 20 ? '🔴 Dry' : moisture > 60 ? '🟡 Wet' : '🟢 Good';
    return { ...f, moisture, temp, status };
  });

  const HEALTH_STATUS: Record<string, string> = { HEALTHY: 'bg-green-100 text-green-700', AT_RISK: 'bg-amber-100 text-amber-700', CRITICAL: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔬 Agronomist Dashboard</h1>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Metric</label>
          <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} className="border rounded px-3 py-1.5 text-sm focus:outline-none">
            {METRICS.map(m => <option key={m} value={m}>{METRIC_LABELS[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Date Range</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded px-3 py-1.5 text-sm focus:outline-none">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Soil Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">{METRIC_LABELS[selectedMetric]} — Trend by Field</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {fieldKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Yield Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Crop Yield: Expected vs Actual (kg)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Expected" fill="#93c5fd" radius={[4,4,0,0]} />
              <Bar dataKey="Actual" fill="#22c55e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Livestock Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Livestock Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Species</th><th className="pb-2">Count</th><th className="pb-2">Status</th>
              </tr></thead>
              <tbody>
                {livestock.map((l: any) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-2">{l.species}</td>
                    <td className="py-2">{l.count.toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${HEALTH_STATUS[l.health_status] || 'bg-gray-100'}`}>{l.health_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Field Health Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Field Health Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Field</th><th className="pb-2">Crop</th><th className="pb-2">Area (ha)</th>
              <th className="pb-2">Soil Moisture</th><th className="pb-2">Temp (°C)</th><th className="pb-2">Status</th>
            </tr></thead>
            <tbody>
              {healthTable.map((f: any) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2">{f.name}</td>
                  <td className="py-2">{f.crop_type}</td>
                  <td className="py-2">{f.area_hectares}</td>
                  <td className="py-2">{f.moisture?.toFixed(1) ?? '—'}%</td>
                  <td className="py-2">{f.temp?.toFixed(1) ?? '—'}</td>
                  <td className="py-2">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
