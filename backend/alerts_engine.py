import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from models import Alert


ALERT_RULES = [
    {
        "alert_type": "LOW_SOIL_MOISTURE",
        "metric": "soil_moisture",
        "threshold": 20.0,
        "comparator": "lt",
        "severity": "WARNING",
        "message_tpl": "Soil moisture dropped to {value:.1f}% (below 20%) in field {field_id}",
    },
    {
        "alert_type": "HIGH_TEMPERATURE",
        "metric": "temperature",
        "threshold": 38.0,
        "comparator": "gt",
        "severity": "WARNING",
        "message_tpl": "Temperature reached {value:.1f}°C (above 38°C) in field {field_id}",
    },
    {
        "alert_type": "FROST_RISK",
        "metric": "temperature",
        "threshold": 2.0,
        "comparator": "lt",
        "severity": "CRITICAL",
        "message_tpl": "Frost risk: temperature is {value:.1f}°C (below 2°C) in field {field_id}",
    },
]


class AlertsEngine:
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager

    def evaluate(self, field_id: int, farm_id: int, metric_type: str, value: float, db: Session):
        for rule in ALERT_RULES:
            if rule["metric"] != metric_type:
                continue
            breached = (rule["comparator"] == "lt" and value < rule["threshold"]) or \
                       (rule["comparator"] == "gt" and value > rule["threshold"])
            if not breached:
                continue
            # Deduplication: only create if no open alert of same type+field
            existing = db.query(Alert).filter(
                Alert.field_id == field_id,
                Alert.alert_type == rule["alert_type"],
                Alert.resolved_at == None  # noqa
            ).first()
            if existing:
                continue
            alert = Alert(
                farm_id=farm_id,
                field_id=field_id,
                alert_type=rule["alert_type"],
                message=rule["message_tpl"].format(value=value, field_id=field_id),
                severity=rule["severity"],
                triggered_at=datetime.utcnow(),
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            # Broadcast asynchronously
            alert_data = {
                "type": "alert_new",
                "data": {
                    "id": alert.id,
                    "farm_id": alert.farm_id,
                    "field_id": alert.field_id,
                    "alert_type": alert.alert_type,
                    "message": alert.message,
                    "severity": alert.severity,
                    "triggered_at": alert.triggered_at.isoformat(),
                }
            }
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(self.ws_manager.broadcast_to_farm(farm_id, alert_data))
            except RuntimeError:
                pass

    def evaluate_market_spike(self, commodity: str, region: str, new_price: float,
                               old_price: float, farm_id: int, db: Session):
        if old_price <= 0:
            return
        pct_change = (new_price - old_price) / old_price * 100
        if pct_change <= 8.0:
            return
        # Dedup by commodity+region for market spike (no field_id)
        existing = db.query(Alert).filter(
            Alert.farm_id == farm_id,
            Alert.alert_type == "MARKET_PRICE_SPIKE",
            Alert.resolved_at == None  # noqa
        ).first()
        if existing:
            return
        alert = Alert(
            farm_id=farm_id,
            field_id=None,
            alert_type="MARKET_PRICE_SPIKE",
            message=f"{commodity.capitalize()} price spiked +{pct_change:.1f}% in {region}",
            severity="INFO",
            triggered_at=datetime.utcnow(),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        alert_data = {
            "type": "alert_new",
            "data": {
                "id": alert.id,
                "farm_id": alert.farm_id,
                "field_id": alert.field_id,
                "alert_type": alert.alert_type,
                "message": alert.message,
                "severity": alert.severity,
                "triggered_at": alert.triggered_at.isoformat(),
            }
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self.ws_manager.broadcast_all(alert_data))
        except RuntimeError:
            pass
