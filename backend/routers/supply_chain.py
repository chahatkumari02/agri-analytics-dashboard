from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from database import get_db
from models import SupplyChainEvent, Crop, Field
from deps import get_current_user
from models import User

router = APIRouter(prefix="/supply-chain", tags=["supply-chain"])


@router.get("/events")
def get_events(
    farm_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(SupplyChainEvent)
    if farm_id:
        q = q.filter(SupplyChainEvent.farm_id == farm_id)
    if event_type:
        q = q.filter(SupplyChainEvent.event_type == event_type)
    events = q.order_by(SupplyChainEvent.event_time.desc()).limit(limit).all()
    return [{
        "id": e.id, "farm_id": e.farm_id, "event_type": e.event_type,
        "commodity": e.commodity, "quantity_kg": e.quantity_kg,
        "location": e.location, "event_time": e.event_time.isoformat()
    } for e in events]


@router.get("/summary")
def get_summary(
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(SupplyChainEvent)
    if farm_id:
        q = q.filter(SupplyChainEvent.farm_id == farm_id)
    events = q.all()
    summary = {"HARVESTED": 0, "TRANSPORTED": 0, "STORED": 0, "SOLD": 0}
    for e in events:
        if e.event_type in summary:
            summary[e.event_type] += e.quantity_kg
    return summary


@router.get("/harvest-forecast")
def harvest_forecast(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    q = db.query(Crop).join(Field).filter(
        Crop.harvest_date > now,
        Crop.growth_stage != "HARVEST_READY"
    )
    crops = q.all()
    result = []
    for c in crops:
        days_until = (c.harvest_date - now).days if c.harvest_date else None
        result.append({
            "crop_id": c.id,
            "field_id": c.field_id,
            "farm_id": c.field.farm_id,
            "crop_name": c.crop_name,
            "harvest_date": c.harvest_date.isoformat() if c.harvest_date else None,
            "expected_yield_kg": c.expected_yield_kg,
            "growth_stage": c.growth_stage,
            "days_until_harvest": days_until,
        })
    result.sort(key=lambda x: x["days_until_harvest"] or 9999)
    return result
