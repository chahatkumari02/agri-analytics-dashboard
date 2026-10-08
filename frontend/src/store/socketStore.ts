import { create } from 'zustand';

interface SocketStore {
  socket: WebSocket | null;
  setSocket: (ws: WebSocket | null) => void;
  latestSensorData: Record<string, Record<string, number>>; // fieldId -> metric -> value
  latestMarketData: Record<string, Record<string, number>>; // commodity -> region -> price
  updateSensor: (fieldId: number, metric: string, value: number) => void;
  updateMarket: (commodity: string, region: string, price: number, pctChange: number) => void;
  newAlerts: any[];
  addAlert: (alert: any) => void;
  clearAlerts: () => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  setSocket: (ws) => set({ socket: ws }),
  latestSensorData: {},
  latestMarketData: {},
  updateSensor: (fieldId, metric, value) =>
    set((state) => ({
      latestSensorData: {
        ...state.latestSensorData,
        [fieldId]: { ...(state.latestSensorData[fieldId] || {}), [metric]: value },
      },
    })),
  updateMarket: (commodity, region, price, pctChange) =>
    set((state) => ({
      latestMarketData: {
        ...state.latestMarketData,
        [commodity]: {
          ...(state.latestMarketData[commodity] || {}),
          [region]: price,
          [`${region}_pct`]: pctChange,
        },
      },
    })),
  newAlerts: [],
  addAlert: (alert) => set((state) => ({ newAlerts: [alert, ...state.newAlerts.slice(0, 19)] })),
  clearAlerts: () => set({ newAlerts: [] }),
}));
