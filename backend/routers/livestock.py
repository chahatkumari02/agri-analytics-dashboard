from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Livestock
from deps import get_current_user
from models import User

router = APIRouter(prefix="/livestock", tags=["livestock"])


@router.get("")
def get_livestock(
    farm_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Livestock)
    if farm_id:
        q = q.filter(Livestock.farm_id == farm_id)
    elif current_user.role == "FARMER" and current_user.farm_id:
        q = q.filter(Livestock.farm_id == current_user.farm_id)
    animals = q.all()
    return [{
        "id": a.id, "farm_id": a.farm_id, "species": a.species,
        "count": a.count, "health_status": a.health_status,
        "last_updated": a.last_updated.isoformat() if a.last_updated else None
    } for a in animals]
