import random
import bcrypt
from datetime import datetime, timedelta
from database import SessionLocal, engine
from models import Base, Farm, User, Field, Crop, Livestock, SensorReading, WeatherSnapshot, MarketPrice, Alert, SupplyChainEvent


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    try:
        # Skip if already seeded
        if db.query(Farm).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("Seeding database...")

        # ── FARMS ──────────────────────────────────────────────────────────────
        farms_data = [
            Farm(name="Green Horizon Farm", region="Northern Plains", location_lat=43.6, location_lng=-96.7),
            Farm(name="Delta Agro Estate", region="Coastal Delta", location_lat=30.2, location_lng=-90.1),
            Farm(name="Summit Agricultural Co.", region="Highland Valley", location_lat=37.4, location_lng=-119.5),
        ]
        db.add_all(farms_data)
        db.flush()

        # ── USERS ──────────────────────────────────────────────────────────────
        users_data = [
            User(name="James Hartley", email="farmer@demo.com", hashed_password=hash_password("demo1234"), role="FARMER", farm_id=farms_data[0].id),
            User(name="Dr. Priya Nair", email="agronomist@demo.com", hashed_password=hash_password("demo1234"), role="AGRONOMIST", farm_id=None),
            User(name="Carlos Mendes", email="supply@demo.com", hashed_password=hash_password("demo1234"), role="SUPPLY_CHAIN", farm_id=None),
            User(name="Sophie Chen", email="market@demo.com", hashed_password=hash_password("demo1234"), role="MARKET_ANALYST", farm_id=None),
            User(name="Admin User", email="admin@demo.com", hashed_password=hash_password("demo1234"), role="ADMIN", farm_id=None),
        ]
        db.add_all(users_data)
        db.flush()

        # ── FIELDS ─────────────────────────────────────────────────────────────
        crop_types = ["wheat", "maize", "soybean", "rice"]
        statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "IRRIGATING"]
        all_fields = []
        for i, farm in enumerate(farms_data):
            for j, crop in enumerate(crop_types):
                field = Field(
                    farm_id=farm.id,
                    name=f"Field {chr(65+j)} - {crop.capitalize()}",
                    area_hectares=round(random.uniform(15, 45), 1),
                    crop_type=crop,
                    status=statuses[j]
                )
                all_fields.append(field)
                db.add(field)
        db.flush()

        # ── LIVESTOCK ──────────────────────────────────────────────────────────
        livestock_specs = [
            ("Cattle", 120, "HEALTHY"),
            ("Sheep", 350, "HEALTHY"),
            ("Poultry", 2400, "AT_RISK"),
            ("Pigs", 85, "HEALTHY"),
            ("Goats", 65, "HEALTHY"),
            ("Horses", 12, "HEALTHY"),
        ]
        for i, farm in enumerate(farms_data):
            for species, base_count, status in livestock_specs[:2 + i]:
                db.add(Livestock(
                    farm_id=farm.id,
                    species=species,
                    count=base_count + random.randint(-20, 20),
                    health_status=status,
                    last_updated=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                ))
        db.flush()

        # ── CROPS ──────────────────────────────────────────────────────────────
        growth_stages = ["GERMINATION", "VEGETATIVE", "FLOWERING", "MATURATION", "HARVEST_READY"]
        for idx, field in enumerate(all_fields):
            stage_idx = idx % len(growth_stages)
            planting = datetime.utcnow() - timedelta(days=60 + random.randint(0, 30))
            harvest = planting + timedelta(days=120 + random.randint(0, 30))
            expected = round(random.uniform(3000, 8000), 0)
            actual = round(expected * random.uniform(0.75, 1.1), 0) if stage_idx >= 3 else None
            db.add(Crop(
                field_id=field.id,
                crop_name=field.crop_type,
                planting_date=planting,
                harvest_date=harvest,
                expected_yield_kg=expected,
                actual_yield_kg=actual,
                growth_stage=growth_stages[stage_idx]
            ))
        db.flush()

        # ── SENSOR READINGS (90 days, every 30 min) ────────────────────────────
        print("  Generating sensor readings (this takes a moment)...")
        metric_config = {
            "soil_moisture": (15.0, 80.0, 40.0, 2.0),   # min, max, start, step
            "temperature":   (5.0,  40.0, 22.0, 0.5),
            "humidity":      (30.0, 90.0, 55.0, 2.0),
        }
        now = datetime.utcnow()
        start = now - timedelta(days=90)
        batch = []
        for field in all_fields:
            values = {m: cfg[2] + random.uniform(-5, 5) for m, cfg in metric_config.items()}
            t = start
            while t <= now:
                for metric, (mn, mx, _, step) in metric_config.items():
                    values[metric] = max(mn, min(mx, values[metric] + random.uniform(-step, step)))
                    batch.append(SensorReading(
                        field_id=field.id,
                        metric_type=metric,
                        value=round(values[metric], 2),
                        recorded_at=t
                    ))
                t += timedelta(minutes=30)
                if len(batch) >= 5000:
                    db.bulk_save_objects(batch)
                    batch = []
        if batch:
            db.bulk_save_objects(batch)
        print("  Sensor readings done.")

        # ── WEATHER SNAPSHOTS (90 days, every 6 hours) ─────────────────────────
        conditions = ["Clear", "Cloudy", "Light Rain", "Heavy Rain", "Sunny", "Overcast"]
        for farm in farms_data:
            t = start
            temp = 18.0
            while t <= now:
                temp = max(5, min(40, temp + random.uniform(-1, 1)))
                db.add(WeatherSnapshot(
                    farm_id=farm.id,
                    temperature_c=round(temp, 1),
                    humidity_pct=round(random.uniform(35, 85), 1),
                    rainfall_mm=round(random.uniform(0, 15) if random.random() < 0.2 else 0, 1),
                    condition_label=random.choice(conditions),
                    recorded_at=t
                ))
                t += timedelta(hours=6)

        # ── MARKET PRICES (90 days, daily) ─────────────────────────────────────
        price_config = {
            "wheat":   (180.0, 260.0, 220.0),
            "maize":   (150.0, 220.0, 185.0),
            "soybean": (380.0, 480.0, 430.0),
            "rice":    (350.0, 430.0, 390.0),
        }
        regions = ["Northern Plains", "Coastal Delta", "Highland Valley"]
        for commodity, (mn, mx, start_price) in price_config.items():
            for region in regions:
                price = start_price + random.uniform(-10, 10)
                t = start
                while t <= now:
                    price = max(mn, min(mx, price * (1 + random.uniform(-0.03, 0.03))))
                    db.add(MarketPrice(
                        commodity=commodity,
                        region=region,
                        price_per_unit=round(price, 2),
                        currency="USD",
                        recorded_at=t
                    ))
                    t += timedelta(days=1)

        # ── SUPPLY CHAIN EVENTS ────────────────────────────────────────────────
        event_types = ["HARVESTED", "TRANSPORTED", "STORED", "SOLD"]
        locations_map = {
            1: ["North Silo A", "Transit Hub 1", "Warehouse District", "City Market"],
            2: ["Delta Barn B", "Port Logistics", "Cold Storage 2", "Export Terminal"],
            3: ["Highland Depot", "Valley Freight", "Mountain Storage", "Regional Exchange"],
        }
        for farm in farms_data:
            for commodity in crop_types:
                for i, etype in enumerate(event_types):
                    db.add(SupplyChainEvent(
                        farm_id=farm.id,
                        event_type=etype,
                        commodity=commodity,
                        quantity_kg=round(random.uniform(2000, 12000), 0),
                        location=locations_map[farm.id][i],
                        event_time=now - timedelta(days=random.randint(1, 80))
                    ))

        # ── PRE-SEEDED ALERTS ──────────────────────────────────────────────────
        alert_seeds = [
            Alert(farm_id=1, field_id=all_fields[0].id, alert_type="FROST_RISK", message="Temperature dropped below 2°C in Field A", severity="CRITICAL", triggered_at=now - timedelta(hours=5), resolved_at=None),
            Alert(farm_id=1, field_id=all_fields[1].id, alert_type="LOW_SOIL_MOISTURE", message="Soil moisture below 20% in Field B", severity="WARNING", triggered_at=now - timedelta(hours=2), resolved_at=None),
            Alert(farm_id=2, field_id=all_fields[4].id, alert_type="HIGH_TEMPERATURE", message="Temperature exceeded 38°C in Field A", severity="WARNING", triggered_at=now - timedelta(hours=10), resolved_at=now - timedelta(hours=8)),
            Alert(farm_id=3, field_id=all_fields[8].id, alert_type="LOW_SOIL_MOISTURE", message="Soil moisture below 20% in Field A", severity="WARNING", triggered_at=now - timedelta(hours=3), resolved_at=None),
            Alert(farm_id=2, field_id=None, alert_type="MARKET_PRICE_SPIKE", message="Soybean price spiked +9.2% in Coastal Delta", severity="INFO", triggered_at=now - timedelta(hours=1), resolved_at=now - timedelta(minutes=30)),
        ]
        db.add_all(alert_seeds)

        db.commit()
        print("✅ Database seeded successfully!")
        print(f"   Farms: {db.query(Farm).count()}")
        print(f"   Users: {db.query(User).count()}")
        print(f"   Fields: {db.query(Field).count()}")
        print(f"   Crops: {db.query(Crop).count()}")
        print(f"   Sensor readings: {db.query(SensorReading).count()}")
        print(f"   Market prices: {db.query(MarketPrice).count()}")
        print(f"   Supply chain events: {db.query(SupplyChainEvent).count()}")
        print(f"   Alerts: {db.query(Alert).count()}")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
