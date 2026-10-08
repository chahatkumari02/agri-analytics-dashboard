import asyncio
import json
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # farm_id -> list of websockets
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, farm_id: str, websocket: WebSocket):
        await websocket.accept()
        if farm_id not in self.connections:
            self.connections[farm_id] = []
        self.connections[farm_id].append(websocket)

    def disconnect(self, farm_id: str, websocket: WebSocket):
        if farm_id in self.connections:
            try:
                self.connections[farm_id].remove(websocket)
            except ValueError:
                pass

    async def broadcast_to_farm(self, farm_id: int, data: dict):
        key = str(farm_id)
        if key not in self.connections:
            return
        dead = []
        for ws in self.connections[key]:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(key, ws)

    async def broadcast_all(self, data: dict):
        """Broadcast to all connected clients (used for market updates)."""
        for farm_id in list(self.connections.keys()):
            await self.broadcast_to_farm(int(farm_id), data)


ws_manager = ConnectionManager()
