from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from models import SensorReading, Field
from deps import get_current_user
from models import User

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.get("/readings")
def get_readings(
    field_id: Optional[int] = None,
    metric_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(default=200, le=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(SensorReading)
    if field_id:
        q = q.filter(SensorReading.field_id == field_id)
    elif current_user.role == "FARMER" and current_user.farm_id:
        farm_field_ids = [f.id for f in db.query(Field).filter(Field.farm_id == current_user.farm_id).all()]
        q = q.filter(SensorReading.field_id.in_(farm_field_ids))
    if metric_type:
        q = q.filter(SensorReading.metric_type == metric_type)
    if from_date:
        q = q.filter(SensorReading.recorded_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.filter(SensorReading.recorded_at <= datetime.fromisoformat(to_date))
    readings = q.order_by(SensorReading.recorded_at.desc()).limit(limit).all()
    return [{
        "id": r.id, "field_id": r.field_id, "metric_type": r.metric_type,
        "value": r.value, "recorded_at": r.recorded_at.isoformat()
    } for r in reversed(readings)]


@router.get("/latest")
def get_latest_per_field(
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the latest reading for each metric for each field in a farm."""
    if farm_id:
        fields = db.query(Field).filter(Field.farm_id == farm_id).all()
    elif current_user.farm_id:
        fields = db.query(Field).filter(Field.farm_id == current_user.farm_id).all()
    else:
        fields = db.query(Field).all()

    result = []
    for field in fields:
        field_data = {"field_id": field.id, "field_name": field.name, "farm_id": field.farm_id}
        for metric in ["soil_moisture", "temperature", "humidity"]:
            latest = db.query(SensorReading).filter(
                SensorReading.field_id == field.id,
                SensorReading.metric_type == metric
            ).order_by(SensorReading.recorded_at.desc()).first()
            field_data[metric] = latest.value if latest else None
        result.append(field_data)
    return result
