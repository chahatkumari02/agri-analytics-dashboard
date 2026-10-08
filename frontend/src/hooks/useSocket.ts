import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const { setSocket, updateSensor, updateMarket, addAlert } = useSocketStore();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;
    const farmId = user.farm_id ?? 'global';

    function connect() {
      const ws = new WebSocket(`ws://localhost:8000/ws/${farmId}`);
      wsRef.current = ws;
      setSocket(ws);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'sensor_update') {
            updateSensor(msg.data.field_id, msg.data.metric_type, msg.data.value);
          } else if (msg.type === 'market_update') {
            updateMarket(msg.data.commodity, msg.data.region, msg.data.price, msg.data.pct_change);
          } else if (msg.type === 'alert_new') {
            addAlert(msg.data);
          }
        } catch {}
      };

      ws.onclose = () => {
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [user?.user_id]);

  return wsRef;
}
