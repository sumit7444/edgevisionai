import json
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models import Violation
from app.schemas import ViolationOut

router = APIRouter(prefix="/api/violations", tags=["violations"])


@router.get("", response_model=list[ViolationOut])
def list_violations(
    camera_id: Optional[str] = None,
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Violation)
    if camera_id:
        q = q.filter(Violation.camera_id == camera_id)
    if violation_type:
        q = q.filter(Violation.violation_type == violation_type)
    if severity:
        q = q.filter(Violation.severity == severity)
    if resolved is not None:
        q = q.filter(Violation.resolved == resolved)
    if start_date:
        q = q.filter(Violation.created_at >= start_date)
    if end_date:
        q = q.filter(Violation.created_at <= end_date)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Violation.violation_type.ilike(like), Violation.worker_track_id.ilike(like)))
    rows = q.order_by(desc(Violation.created_at)).limit(limit).all()
    out = []
    for r in rows:
        out.append(
            ViolationOut(
                id=r.id,
                camera_id=r.camera_id,
                zone_id=r.zone_id,
                worker_track_id=r.worker_track_id,
                violation_type=r.violation_type,
                severity=r.severity,
                confidence=r.confidence,
                bbox=json.loads(r.bbox) if r.bbox else None,
                snapshot_path=r.snapshot_path,
                acknowledged=r.acknowledged,
                resolved=r.resolved,
                created_at=r.created_at,
            )
        )
    return out


@router.patch("/{violation_id}/acknowledge")
def acknowledge_violation(violation_id: str, db: Session = Depends(get_db)):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        return {"error": "not found"}
    v.acknowledged = True
    db.commit()
    return {"status": "acknowledged", "id": violation_id}


@router.patch("/{violation_id}/resolve")
def resolve_violation(violation_id: str, db: Session = Depends(get_db)):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        return {"error": "not found"}
    v.resolved = True
    db.commit()
    return {"status": "resolved", "id": violation_id}


@router.get("/{violation_id}/snapshot")
def get_snapshot(violation_id: str, db: Session = Depends(get_db)):
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v or not v.snapshot_path:
        return {"error": "not found"}
    return FileResponse(v.snapshot_path)
