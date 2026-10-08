from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from models import MarketPrice
from deps import get_current_user
from models import User

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/prices")
def get_prices(
    commodity: Optional[str] = None,
    region: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = Query(default=200, le=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(MarketPrice)
    if commodity:
        q = q.filter(MarketPrice.commodity == commodity)
    if region:
        q = q.filter(MarketPrice.region == region)
    if from_date:
        q = q.filter(MarketPrice.recorded_at >= datetime.fromisoformat(from_date))
    if to_date:
        q = q.filter(MarketPrice.recorded_at <= datetime.fromisoformat(to_date))
    prices = q.order_by(MarketPrice.recorded_at.desc()).limit(limit).all()
    return [{
        "id": p.id, "commodity": p.commodity, "region": p.region,
        "price_per_unit": p.price_per_unit, "currency": p.currency,
        "recorded_at": p.recorded_at.isoformat()
    } for p in reversed(prices)]


@router.get("/prices/latest")
def get_latest_prices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Latest price per commodity+region combination."""
    commodities = ["wheat", "maize", "soybean", "rice"]
    regions = ["Northern Plains", "Coastal Delta", "Highland Valley"]
    result = []
    for commodity in commodities:
        for region in regions:
            latest = db.query(MarketPrice).filter(
                MarketPrice.commodity == commodity,
                MarketPrice.region == region
            ).order_by(MarketPrice.recorded_at.desc()).first()
            if latest:
                # Get previous price for % change
                prev = db.query(MarketPrice).filter(
                    MarketPrice.commodity == commodity,
                    MarketPrice.region == region,
                    MarketPrice.id < latest.id
                ).order_by(MarketPrice.recorded_at.desc()).first()
                pct = 0.0
                if prev and prev.price_per_unit:
                    pct = (latest.price_per_unit - prev.price_per_unit) / prev.price_per_unit * 100
                result.append({
                    "commodity": commodity, "region": region,
                    "price_per_unit": latest.price_per_unit, "currency": latest.currency,
                    "recorded_at": latest.recorded_at.isoformat(),
                    "pct_change": round(pct, 2)
                })
    return result
