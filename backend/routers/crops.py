from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Crop, Field
from deps import get_current_user
from models import User
from datetime import datetime

router = APIRouter(prefix="/crops", tags=["crops"])


@router.get("")
def get_crops(
    field_id: Optional[int] = None,
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Crop).join(Field)
    if field_id:
        q = q.filter(Crop.field_id == field_id)
    if farm_id:
        q = q.filter(Field.farm_id == farm_id)
    elif current_user.role == "FARMER" and current_user.farm_id:
        q = q.filter(Field.farm_id == current_user.farm_id)
    crops = q.all()
    return [{
        "id": c.id, "field_id": c.field_id, "crop_name": c.crop_name,
        "planting_date": c.planting_date.isoformat() if c.planting_date else None,
        "harvest_date": c.harvest_date.isoformat() if c.harvest_date else None,
        "expected_yield_kg": c.expected_yield_kg,
        "actual_yield_kg": c.actual_yield_kg,
        "growth_stage": c.growth_stage
    } for c in crops]


@router.get("/yield-summary")
def yield_summary(
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Crop).join(Field)
    if farm_id:
        q = q.filter(Field.farm_id == farm_id)
    elif current_user.role == "FARMER" and current_user.farm_id:
        q = q.filter(Field.farm_id == current_user.farm_id)
    crops = q.all()
    summary = {}
    for c in crops:
        key = c.crop_name
        if key not in summary:
            summary[key] = {"crop_name": key, "total_expected_kg": 0, "total_actual_kg": 0, "field_count": 0}
        summary[key]["total_expected_kg"] += c.expected_yield_kg or 0
        summary[key]["total_actual_kg"] += c.actual_yield_kg or 0
        summary[key]["field_count"] += 1
    return list(summary.values())
