from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)

    fields = relationship("Field", back_populates="farm")
    users = relationship("User", back_populates="farm")
    livestock = relationship("Livestock", back_populates="farm")
    weather_snapshots = relationship("WeatherSnapshot", back_populates="farm")
    supply_chain_events = relationship("SupplyChainEvent", back_populates="farm")
    alerts = relationship("Alert", back_populates="farm")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # FARMER, AGRONOMIST, SUPPLY_CHAIN, MARKET_ANALYST, ADMIN
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    is_active = Column(Boolean, default=True)

    farm = relationship("Farm", back_populates="users")


class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    name = Column(String, nullable=False)
    area_hectares = Column(Float, nullable=False)
    crop_type = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")  # ACTIVE, FALLOW, IRRIGATING

    farm = relationship("Farm", back_populates="fields")
    crops = relationship("Crop", back_populates="field")
    sensor_readings = relationship("SensorReading", back_populates="field")
    alerts = relationship("Alert", back_populates="field")


class Crop(Base):
    __tablename__ = "crops"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    crop_name = Column(String, nullable=False)
    planting_date = Column(DateTime, nullable=False)
    harvest_date = Column(DateTime, nullable=True)
    expected_yield_kg = Column(Float, nullable=True)
    actual_yield_kg = Column(Float, nullable=True)
    growth_stage = Column(String, default="GERMINATION")  # GERMINATION, VEGETATIVE, FLOWERING, MATURATION, HARVEST_READY

    field = relationship("Field", back_populates="crops")


class Livestock(Base):
    __tablename__ = "livestock"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    species = Column(String, nullable=False)
    count = Column(Integer, nullable=False)
    health_status = Column(String, default="HEALTHY")  # HEALTHY, AT_RISK, CRITICAL
    last_updated = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="livestock")


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    metric_type = Column(String, nullable=False)  # soil_moisture, temperature, humidity
    value = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    field = relationship("Field", back_populates="sensor_readings")


class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    temperature_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    rainfall_mm = Column(Float, default=0.0)
    condition_label = Column(String, default="Clear")
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    farm = relationship("Farm", back_populates="weather_snapshots")


class MarketPrice(Base):
    __tablename__ = "market_prices"
    id = Column(Integer, primary_key=True, index=True)
    commodity = Column(String, nullable=False)
    region = Column(String, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    alert_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL, WARNING, INFO
    triggered_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    farm = relationship("Farm", back_populates="alerts")
    field = relationship("Field", back_populates="alerts")


class SupplyChainEvent(Base):
    __tablename__ = "supply_chain_events"
    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    event_type = Column(String, nullable=False)  # HARVESTED, TRANSPORTED, STORED, SOLD
    commodity = Column(String, nullable=False)
    quantity_kg = Column(Float, nullable=False)
    location = Column(String, nullable=False)
    event_time = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="supply_chain_events")
