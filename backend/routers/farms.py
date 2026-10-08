from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Farm, Field
from deps import get_current_user
from models import User

router = APIRouter(prefix="/farms", tags=["farms"])


@router.get("")
def list_farms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role in ("ADMIN", "AGRONOMIST", "SUPPLY_CHAIN", "MARKET_ANALYST"):
        farms = db.query(Farm).all()
    else:
        farms = db.query(Farm).filter(Farm.id == current_user.farm_id).all()
    return [{"id": f.id, "name": f.name, "region": f.region,
             "location_lat": f.location_lat, "location_lng": f.location_lng} for f in farms]


@router.get("/{farm_id}/fields")
def get_fields(farm_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ("ADMIN", "AGRONOMIST", "SUPPLY_CHAIN") and current_user.farm_id != farm_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    fields = db.query(Field).filter(Field.farm_id == farm_id).all()
    return [{"id": f.id, "farm_id": f.farm_id, "name": f.name,
             "area_hectares": f.area_hectares, "crop_type": f.crop_type, "status": f.status} for f in fields]
