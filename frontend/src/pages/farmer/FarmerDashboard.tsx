import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle, CloudSun, Droplets, Thermometer, Wind } from 'lucide-react';
import axios from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';

function SensorGauge({ label, value, unit, min, max, getColor }: any) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  const color = getColor(value);
  const data = [{ name: label, value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <div className="w-28 h-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#e5e7eb' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{value?.toFixed(1)}</span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 mt-1">{label}</span>
    </div>
  );
}

function getMoistureColor(v: number) {
  if (v < 20) return '#ef4444';
  if (v > 60) return '#f59e0b';
  return '#22c55e';
}
function getTempColor(v: number) {
  if (v < 5) return '#3b82f6';
  if (v > 35) return '#ef4444';
  return '#22c55e';
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-200',
  INFO: 'bg-blue-100 text-blue-700 border-blue-200',
};
const STAGE_STEPS = ['GERMINATION', 'VEGETATIVE', 'FLOWERING', 'MATURATION', 'HARVEST_READY'];

export default function FarmerDashboard() {
  const user = useAuthStore((s) => s.user);
  const { latestSensorData, newAlerts } = useSocketStore();
  const queryClient = useQueryClient();

  const farmId = user?.farm_id;

  const { data: fields = [] } = useQuery({ queryKey: ['fields', farmId], queryFn: () => axios.get(`/farms/${farmId}/fields`).then(r => r.data), enabled: !!farmId });
  const { data: sensorLatest = [] } = useQuery({ queryKey: ['sensor-latest', farmId], queryFn: () => axios.get(`/sensors/latest?farm_id=${farmId}`).then(r => r.data), refetchInterval: 15000 });
  const { data: crops = [] } = useQuery({ queryKey: ['crops', farmId], queryFn: () => axios.get(`/crops?farm_id=${farmId}`).then(r => r.data) });
  const { data: weather } = useQuery({ queryKey: ['weather', farmId], queryFn: () => axios.get(`/weather/current?farm_id=${farmId}`).then(r => r.data), refetchInterval: 30000 });
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({ queryKey: ['alerts', farmId], queryFn: () => axios.get(`/alerts?farm_id=${farmId}&status=open`).then(r => r.data) });

  // Merge live alerts
  useEffect(() => { if (newAlerts.length) refetchAlerts(); }, [newAlerts.length]);

  const resolveMutation = useMutation({
    mutationFn: (id: number) => axios.patch(`/alerts/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const getSensor = (fieldId: number, metric: string, fallback: number) => {
    return latestSensorData[fieldId]?.[metric] ?? sensorLatest.find((s: any) => s.field_id === fieldId)?.[metric] ?? fallback;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🌾 Farm Overview</h1>
        <span className="text-sm text-gray-500">Farm: {user?.name}</span>
      </div>

      {/* Weather Snapshot */}
      {weather && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-8">
          <div className="flex items-center gap-2 text-gray-700">
            <CloudSun size={24} className="text-yellow-500" />
            <span className="text-lg font-semibold">{weather.condition_label}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600"><Thermometer size={16} className="text-red-400" /> {weather.temperature_c}°C</div>
          <div className="flex items-center gap-1 text-gray-600"><Droplets size={16} className="text-blue-400" /> {weather.humidity_pct}%</div>
          <div className="flex items-center gap-1 text-gray-600"><Wind size={16} className="text-gray-400" /> {weather.rainfall_mm}mm rain</div>
        </div>
      )}

      {/* Field Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fields.map((field: any) => {
          const moisture = getSensor(field.id, 'soil_moisture', 40);
          const temperature = getSensor(field.id, 'temperature', 22);
          const humidity = getSensor(field.id, 'humidity', 55);
          const crop = crops.find((c: any) => c.field_id === field.id);
          const stageIdx = crop ? STAGE_STEPS.indexOf(crop.growth_stage) : 0;
          const stagePct = Math.round(((stageIdx + 1) / STAGE_STEPS.length) * 100);

          return (
            <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{field.name}</h3>
                  <p className="text-xs text-gray-500">{field.area_hectares} ha · {field.crop_type}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${field.status === 'IRRIGATING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {field.status}
                </span>
              </div>

              {/* Gauges */}
              <div className="flex justify-around">
                <SensorGauge label="Soil Moisture" value={moisture} unit="%" min={15} max={80} getColor={getMoistureColor} />
                <SensorGauge label="Temperature" value={temperature} unit="°C" min={5} max={40} getColor={getTempColor} />
                <SensorGauge label="Humidity" value={humidity} unit="%" min={30} max={90} getColor={() => '#6366f1'} />
              </div>

              {/* Crop Stage */}
              {crop && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{crop.crop_name} · {crop.growth_stage}</span>
                    <span>{stagePct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${stagePct}%` }} />
                  </div>
                  {crop.harvest_date && (
                    <p className="text-xs text-gray-400 mt-1">Harvest: {new Date(crop.harvest_date).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Active Alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} /> All clear — no active alerts</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert: any) => (
              <div key={alert.id} className={`flex items-center justify-between border rounded-lg px-4 py-3 text-sm ${SEVERITY_STYLES[alert.severity] || 'bg-gray-100'}`}>
                <div>
                  <span className="font-medium">{alert.severity}</span> · {alert.message}
                  <span className="ml-2 text-xs opacity-60">{new Date(alert.triggered_at).toLocaleTimeString()}</span>
                </div>
                <button onClick={() => resolveMutation.mutate(alert.id)} className="text-xs underline opacity-70 hover:opacity-100 ml-4">Resolve</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
