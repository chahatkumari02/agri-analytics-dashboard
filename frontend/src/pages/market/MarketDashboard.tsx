import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import axios from '../../api/axios';
import { useSocketStore } from '../../store/socketStore';

const COMMODITIES = ['wheat', 'maize', 'soybean', 'rice'];
const REGIONS = ['Northern Plains', 'Coastal Delta', 'Highland Valley'];
const COLORS: Record<string, string> = { wheat: '#f59e0b', maize: '#22c55e', soybean: '#8b5cf6', rice: '#3b82f6' };

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
}

export default function MarketDashboard() {
  const [selectedCommodity, setSelectedCommodity] = useState('wheat');
  const [days, setDays] = useState(30);
  const { latestMarketData } = useSocketStore();
  const { from, to } = getDateRange(days);

  const { data: latestPrices = [] } = useQuery({ queryKey: ['market-latest'], queryFn: () => axios.get('/market/prices/latest').then(r => r.data), refetchInterval: 30000 });
  const { data: history = [] } = useQuery({
    queryKey: ['market-history', selectedCommodity, days],
    queryFn: () => axios.get(`/market/prices?commodity=${selectedCommodity}&from_date=${from}&to_date=${to}&limit=500`).then(r => r.data),
  });

  // Group history by date (average across regions)
  const historyByDate: Record<string, { date: string; [r: string]: any }> = {};
  history.forEach((p: any) => {
    const date = p.recorded_at.split('T')[0];
    if (!historyByDate[date]) historyByDate[date] = { date };
    historyByDate[date][p.region] = p.price_per_unit;
  });
  const historyData = Object.values(historyByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));

  // Live price summary per commodity (use WS data if available, else latest REST)
  const getSummary = (commodity: string) => {
    const prices = latestPrices.filter((p: any) => p.commodity === commodity);
    const avgPrice = prices.length ? prices.reduce((s: number, p: any) => s + p.price_per_unit, 0) / prices.length : 0;
    const avgPct = prices.length ? prices.reduce((s: number, p: any) => s + p.pct_change, 0) / prices.length : 0;
    const wsPrice = latestMarketData[commodity]?.['Northern Plains'];
    return { price: wsPrice ?? avgPrice, pct: avgPct };
  };

  // Regional price matrix
  const matrix = COMMODITIES.map(c => {
    const row: any = { commodity: c };
    REGIONS.forEach(r => {
      const p = latestPrices.find((lp: any) => lp.commodity === c && lp.region === r);
      row[r] = p?.price_per_unit ?? null;
    });
    return row;
  });

  const allPrices = latestPrices.map((p: any) => p.price_per_unit).filter(Boolean);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const heatColor = (val: number) => {
    if (!val) return 'bg-gray-50';
    const pct = (val - minP) / (maxP - minP || 1);
    if (pct < 0.33) return 'bg-green-100 text-green-800';
    if (pct < 0.66) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📈 Market Analyst Dashboard</h1>

      {/* Price Ticker */}
      <div className="bg-gray-900 rounded-xl p-4 overflow-hidden">
        <div className="flex gap-6 overflow-x-auto pb-1">
          {COMMODITIES.map(c => {
            const { price, pct } = getSummary(c);
            const up = pct >= 0;
            return (
              <div key={c} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2 shrink-0">
                <span className="text-white font-semibold capitalize">{c}</span>
                <span className="text-white font-bold">${price.toFixed(2)}</span>
                <span className={`flex items-center gap-0.5 text-sm font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
                  {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(pct).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Change Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COMMODITIES.map(c => {
          const { price, pct } = getSummary(c);
          const up = pct >= 0;
          return (
            <div key={c} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500 capitalize">{c}</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">${price.toFixed(2)}<span className="text-xs text-gray-400 font-normal">/t</span></div>
              <div className={`flex items-center gap-1 text-sm mt-1 ${up ? 'text-green-600' : 'text-red-600'}`}>
                {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {pct.toFixed(2)}% vs prev
              </div>
            </div>
          );
        })}
      </div>

      {/* Price History Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-gray-700">Price History (USD/tonne)</h2>
          <div className="flex gap-3">
            <select value={selectedCommodity} onChange={e => setSelectedCommodity(e.target.value)} className="border rounded px-3 py-1.5 text-sm focus:outline-none">
              {COMMODITIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
            <select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded px-3 py-1.5 text-sm focus:outline-none">
              <option value={7}>7D</option>
              <option value={30}>30D</option>
              <option value={90}>90D</option>
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={historyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto','auto']} />
            <Tooltip />
            <Legend />
            {REGIONS.map((r, i) => (
              <Line key={r} type="monotone" dataKey={r} stroke={['#22c55e','#3b82f6','#f59e0b'][i]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Regional Price Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">Regional Price Comparison (USD/tonne) <span className="text-xs text-gray-400 font-normal">— green=low, red=high</span></h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 border-b">
              <th className="pb-2 font-medium">Commodity</th>
              {REGIONS.map(r => <th key={r} className="pb-2 font-medium">{r}</th>)}
            </tr></thead>
            <tbody>
              {matrix.map((row: any) => (
                <tr key={row.commodity} className="border-b last:border-0">
                  <td className="py-3 font-semibold capitalize">{row.commodity}</td>
                  {REGIONS.map(r => (
                    <td key={r} className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${heatColor(row[r])}`}>
                        {row[r] ? `$${row[r].toFixed(2)}` : '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
