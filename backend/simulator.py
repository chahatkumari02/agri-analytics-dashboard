import random
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Field, SensorReading, WeatherSnapshot, MarketPrice, Farm
from ws_manager import ws_manager
from alerts_engine import AlertsEngine

METRIC_CONFIG = {
    "soil_moisture": {"min": 15.0, "max": 80.0, "step": 2.0},
    "temperature":   {"min": 5.0,  "max": 40.0, "step": 0.5},
    "humidity":      {"min": 30.0, "max": 90.0, "step": 2.0},
}

PRICE_CONFIG = {
    "wheat":   {"min": 180.0, "max": 260.0},
    "maize":   {"min": 150.0, "max": 220.0},
    "soybean": {"min": 380.0, "max": 480.0},
    "rice":    {"min": 350.0, "max": 430.0},
}

REGIONS = ["Northern Plains", "Coastal Delta", "Highland Valley"]
CONDITIONS = ["Clear", "Cloudy", "Light Rain", "Sunny", "Overcast"]


class MockSimulator:
    def __init__(self):
        self._running = False
        self._last_sensor_write: datetime = None
        self.alerts_engine = AlertsEngine(ws_manager)
        # Cache last sensor values per (field_id, metric)
        self._sensor_cache: dict = {}
        # Cache last market prices per (commodity, region)
        self._price_cache: dict = {}

    def is_running(self) -> bool:
        return self._running

    def last_sensor_write(self):
        return self._last_sensor_write

    def _clamp(self, value, mn, mx):
        return max(mn, min(mx, value))

    def _get_last_sensor(self, db: Session, field_id: int, metric: str) -> float:
        key = (field_id, metric)
        if key not in self._sensor_cache:
            last = db.query(SensorReading).filter(
                SensorReading.field_id == field_id,
                SensorReading.metric_type == metric
            ).order_by(SensorReading.recorded_at.desc()).first()
            cfg = METRIC_CONFIG[metric]
            self._sensor_cache[key] = last.value if last else (cfg["min"] + cfg["max"]) / 2
        return self._sensor_cache[key]

    def _get_last_price(self, db: Session, commodity: str, region: str) -> float:
        key = (commodity, region)
        if key not in self._price_cache:
            last = db.query(MarketPrice).filter(
                MarketPrice.commodity == commodity,
                MarketPrice.region == region
            ).order_by(MarketPrice.recorded_at.desc()).first()
            cfg = PRICE_CONFIG[commodity]
            self._price_cache[key] = last.price_per_unit if last else (cfg["min"] + cfg["max"]) / 2
        return self._price_cache[key]

    async def sensor_tick(self):
        db = SessionLocal()
        try:
            fields = db.query(Field).filter(Field.status != "FALLOW").all()
            now = datetime.utcnow()
            readings = []
            for field in fields:
                for metric, cfg in METRIC_CONFIG.items():
                    last = self._get_last_sensor(db, field.id, metric)
                    new_val = self._clamp(
                        last + random.uniform(-cfg["step"], cfg["step"]),
                        cfg["min"], cfg["max"]
                    )
                    new_val = round(new_val, 2)
                    self._sensor_cache[(field.id, metric)] = new_val
                    reading = SensorReading(
                        field_id=field.id,
                        metric_type=metric,
                        value=new_val,
                        recorded_at=now
                    )
                    readings.append(reading)
                    # Evaluate alert rules
                    self.alerts_engine.evaluate(field.id, field.farm_id, metric, new_val, db)
                    # Broadcast sensor update
                    await ws_manager.broadcast_to_farm(field.farm_id, {
                        "type": "sensor_update",
                        "data": {
                            "field_id": field.id,
                            "farm_id": field.farm_id,
                            "metric_type": metric,
                            "value": new_val,
                            "recorded_at": now.isoformat()
                        }
                    })
            db.bulk_save_objects(readings)
            db.commit()
            self._last_sensor_write = now

            # Weather tick (same interval)
            farms = db.query(Farm).all()
            for farm in farms:
                temp = self._clamp(
                    random.uniform(10, 32) + random.uniform(-1, 1), 5, 40
                )
                snap = WeatherSnapshot(
                    farm_id=farm.id,
                    temperature_c=round(temp, 1),
                    humidity_pct=round(random.uniform(35, 85), 1),
                    rainfall_mm=round(random.uniform(0, 10) if random.random() < 0.15 else 0, 1),
                    condition_label=random.choice(CONDITIONS),
                    recorded_at=now
                )
                db.add(snap)
                await ws_manager.broadcast_to_farm(farm.id, {
                    "type": "weather_update",
                    "data": {
                        "farm_id": farm.id,
                        "temperature_c": snap.temperature_c,
                        "humidity_pct": snap.humidity_pct,
                        "rainfall_mm": snap.rainfall_mm,
                        "condition_label": snap.condition_label,
                        "recorded_at": now.isoformat()
                    }
                })
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[Simulator] sensor_tick error: {e}")
        finally:
            db.close()

    async def market_tick(self):
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            for commodity, cfg in PRICE_CONFIG.items():
                for region in REGIONS:
                    old_price = self._get_last_price(db, commodity, region)
                    new_price = self._clamp(
                        old_price * (1 + random.uniform(-0.015, 0.015)),
                        cfg["min"], cfg["max"]
                    )
                    new_price = round(new_price, 2)
                    # Evaluate market spike alert (use farm_id=1 as placeholder for global)
                    self.alerts_engine.evaluate_market_spike(commodity, region, new_price, old_price, 1, db)
                    self._price_cache[(commodity, region)] = new_price
                    db.add(MarketPrice(
                        commodity=commodity,
                        region=region,
                        price_per_unit=new_price,
                        currency="USD",
                        recorded_at=now
                    ))
                    pct = ((new_price - old_price) / old_price * 100) if old_price else 0
                    await ws_manager.broadcast_all({
                        "type": "market_update",
                        "data": {
                            "commodity": commodity,
                            "region": region,
                            "price": new_price,
                            "pct_change": round(pct, 2),
                            "recorded_at": now.isoformat()
                        }
                    })
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[Simulator] market_tick error: {e}")
        finally:
            db.close()

    async def _run_loop(self):
        self._running = True
        tick_count = 0
        while self._running:
            await self.sensor_tick()
            if tick_count % 30 == 0:  # every 30 * 10s = 5 min
                await self.market_tick()
            tick_count += 1
            await asyncio.sleep(10)

    def start(self):
        asyncio.ensure_future(self._run_loop())

    def stop(self):
        self._running = False


simulator = MockSimulator()
