from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import Alert
from deps import get_current_user
from models import User

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def get_alerts(
    farm_id: Optional[int] = None,
    status: Optional[str] = Query(default=None, description="open or resolved"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(Alert)
    if farm_id:
        q = q.filter(Alert.farm_id == farm_id)
    elif current_user.role == "FARMER" and current_user.farm_id:
        q = q.filter(Alert.farm_id == current_user.farm_id)
    if status == "open":
        q = q.filter(Alert.resolved_at == None)  # noqa
    elif status == "resolved":
        q = q.filter(Alert.resolved_at != None)  # noqa
    alerts = q.order_by(Alert.triggered_at.desc()).all()
    return [{
        "id": a.id, "farm_id": a.farm_id, "field_id": a.field_id,
        "alert_type": a.alert_type, "message": a.message, "severity": a.severity,
        "triggered_at": a.triggered_at.isoformat(),
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
    } for a in alerts]


@router.patch("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"id": alert.id, "resolved_at": alert.resolved_at.isoformat()}
