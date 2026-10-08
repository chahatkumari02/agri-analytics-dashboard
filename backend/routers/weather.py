from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import WeatherSnapshot
from deps import get_current_user
from models import User

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/current")
def get_current_weather(
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fid = farm_id or current_user.farm_id
    if not fid:
        return []
    snap = db.query(WeatherSnapshot).filter(
        WeatherSnapshot.farm_id == fid
    ).order_by(WeatherSnapshot.recorded_at.desc()).first()
    if not snap:
        return None
    return {
        "farm_id": snap.farm_id, "temperature_c": snap.temperature_c,
        "humidity_pct": snap.humidity_pct, "rainfall_mm": snap.rainfall_mm,
        "condition_label": snap.condition_label,
        "recorded_at": snap.recorded_at.isoformat()
    }


@router.get("/history")
def get_weather_history(
    farm_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fid = farm_id or current_user.farm_id
    q = db.query(WeatherSnapshot)
    if fid:
        q = q.filter(WeatherSnapshot.farm_id == fid)
    if from_date:
        q = q.filter(WeatherSnapshot.recorded_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.filter(WeatherSnapshot.recorded_at <= datetime.fromisoformat(to_date))
    snaps = q.order_by(WeatherSnapshot.recorded_at.desc()).limit(limit).all()
    return [{
        "farm_id": s.farm_id, "temperature_c": s.temperature_c,
        "humidity_pct": s.humidity_pct, "rainfall_mm": s.rainfall_mm,
        "condition_label": s.condition_label,
        "recorded_at": s.recorded_at.isoformat()
    } for s in reversed(snaps)]
