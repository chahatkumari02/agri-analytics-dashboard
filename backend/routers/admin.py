from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db, engine
from models import User, SensorReading, MarketPrice
from deps import require_roles
from simulator import simulator

router = APIRouter(prefix="/admin", tags=["admin"])

AdminUser = Depends(require_roles("ADMIN"))


@router.get("/users")
def list_users(current_user=AdminUser, db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id, "name": u.name, "email": u.email,
        "role": u.role, "farm_id": u.farm_id, "is_active": u.is_active
    } for u in users]


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user=AdminUser,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if role:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    db.commit()
    return {"id": user.id, "role": user.role, "is_active": user.is_active}


@router.get("/health")
def system_health(current_user=AdminUser, db: Session = Depends(get_db)):
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    last_sensor = db.query(SensorReading).order_by(SensorReading.recorded_at.desc()).first()
    sensor_count = db.query(SensorReading).count()
    market_count = db.query(MarketPrice).count()
    user_count = db.query(User).count()

    return {
        "db": db_status,
        "simulator_running": simulator.is_running(),
        "last_sensor_write_at": last_sensor.recorded_at.isoformat() if last_sensor else None,
        "record_counts": {
            "sensor_readings": sensor_count,
            "market_prices": market_count,
            "users": user_count,
        }
    }
