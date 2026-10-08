from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from seed import seed
from simulator import simulator
from routers import auth, farms, crops, livestock, sensors, weather, market, supply_chain, alerts, admin, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed on startup
    Base.metadata.create_all(bind=engine)
    seed()
    simulator.start()
    yield
    simulator.stop()


app = FastAPI(
    title="Agriculture Analytics Dashboard API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(farms.router)
app.include_router(crops.router)
app.include_router(livestock.router)
app.include_router(sensors.router)
app.include_router(weather.router)
app.include_router(market.router)
app.include_router(supply_chain.router)
app.include_router(alerts.router)
app.include_router(admin.router)
app.include_router(websocket.router)


@app.get("/health")
def health():
    return {"status": "ok"}
