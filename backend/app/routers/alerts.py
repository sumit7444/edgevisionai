"""
Alert Management Router.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Alert, AuditLog, User
from app.schemas import AlertCreate, AlertOut
from app.auth import get_optional_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    acknowledged: Optional[bool] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Lists alerts with severity and status filters."""
    q = db.query(Alert)
    if severity:
        q = q.filter(Alert.severity == severity)
    if resolved is not None:
        q = q.filter(Alert.resolved == resolved)
    if acknowledged is not None:
        q = q.filter(Alert.acknowledged == acknowledged)

    rows = q.order_by(desc(Alert.created_at)).limit(limit).all()
    return [AlertOut.model_validate(r) for r in rows]


@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db)):
    """Returns the total number of unacknowledged and unresolved alerts."""
    unacknowledged = db.query(Alert).filter(Alert.acknowledged.is_(False)).count()
    unresolved = db.query(Alert).filter(Alert.resolved.is_(False)).count()
    critical = db.query(Alert).filter(Alert.severity == "critical", Alert.resolved.is_(False)).count()
    return {
        "unacknowledged_count": unacknowledged,
        "unresolved_count": unresolved,
        "critical_unresolved_count": critical,
    }


@router.post("", response_model=AlertOut)
def create_alert(
    payload: AlertCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Creates a safety alert."""
    alert = Alert(
        violation_id=payload.violation_id,
        camera_id=payload.camera_id,
        severity=payload.severity,
        title=payload.title,
        message=payload.message,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return AlertOut.model_validate(alert)


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Marks an alert as acknowledged by safety personnel."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.acknowledged = True
    db.commit()
    db.refresh(alert)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action="ACKNOWLEDGE_ALERT",
        resource_type="alert",
        resource_id=alert.id,
        details=f"Alert '{alert.title}' acknowledged.",
    )
    db.add(audit)
    db.commit()

    return AlertOut.model_validate(alert)


@router.patch("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(
    alert_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Marks an alert as resolved."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.resolved = True
    alert.acknowledged = True
    db.commit()
    db.refresh(alert)

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action="RESOLVE_ALERT",
        resource_type="alert",
        resource_id=alert.id,
        details=f"Alert '{alert.title}' resolved.",
    )
    db.add(audit)
    db.commit()

    return AlertOut.model_validate(alert)


@router.delete("/{alert_id}")
def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    """Deletes an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"status": "deleted", "alert_id": alert_id}
