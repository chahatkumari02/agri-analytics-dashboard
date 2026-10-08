from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ws_manager import ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{farm_id}")
async def websocket_endpoint(websocket: WebSocket, farm_id: str):
    await ws_manager.connect(farm_id, websocket)
    try:
        while True:
            # Keep connection alive; clients may send pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(farm_id, websocket)
    except Exception:
        ws_manager.disconnect(farm_id, websocket)
