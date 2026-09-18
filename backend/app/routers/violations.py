import json
import os
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models import Violation, AuditLog, User
from app.schemas import ViolationCreate, ViolationOut
from app.auth import get_optional_current_user

router = APIRouter(prefix="/api/violations", tags=["violations"])


@router.get("", response_model=list[ViolationOut])
def list_violations(
    camera_id: Optional[str] = None,
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    acknowledged: Optional[bool] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
):
    """Lists violations with granular filtering, search, and pagination."""
    q = db.query(Violation)
    if camera_id:
        q = q.filter(Violation.camera_id == camera_id)
    if violation_type:
        q = q.filter(Violation.violation_type == violation_type)
    if severity:
        q = q.filter(Violation.severity == severity)
    if resolved is not None:
        q = q.filter(Violation.resolved == resolved)
    if acknowledged is not None:
        q = q.filter(Violation.acknowledged == acknowledged)
    if start_date:
        q = q.filter(Violation.created_at >= start_date)
    if end_date:
        q = q.filter(Violation.created_at <= end_date)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Violation.violation_type.ilike(like), Violation.worker_track_id.ilike(like)))

    rows = q.order_by(desc(Violation.created_at)).offset(skip).limit(limit).all()
    out = []
    for r in rows:
        bbox_list = None
        if r.bbox:
            try:
                bbox_list = json.loads(r.bbox)
            except Exception:
                bbox_list = None

        out.append(
            ViolationOut(
                id=r.id,
                camera_id=r.camera_id,
                zone_id=r.zone_id,
                worker_track_id=r.worker_track_id,
                violation_type=r.violation_type,
                severity=r.severity,
                confidence=r.confidence,
                bbox=bbox_list,
                snapshot_path=r.snapshot_path,
                evidence_url=r.evidence_url,
                notes=r.notes,
                acknowledged=r.acknowledged,
                acknowledged_by=r.acknowledged_by,
                resolved=r.resolved,
                resolved_by=r.resolved_by,
                resolved_at=r.resolved_at,
                created_at=r.created_at,
            )
        )
    return out


@router.get("/{violation_id}", response_model=ViolationOut)
def get_violation(violation_id: str, db: Session = Depends(get_db)):
    """Retrieves full incident details for a single violation."""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")

    bbox_list = json.loads(v.bbox) if v.bbox else None
    return ViolationOut(
        id=v.id,
        camera_id=v.camera_id,
        zone_id=v.zone_id,
        worker_track_id=v.worker_track_id,
        violation_type=v.violation_type,
        severity=v.severity,
        confidence=v.confidence,
        bbox=bbox_list,
        snapshot_path=v.snapshot_path,
        evidence_url=v.evidence_url,
        notes=v.notes,
        acknowledged=v.acknowledged,
        acknowledged_by=v.acknowledged_by,
        resolved=v.resolved,
        resolved_by=v.resolved_by,
        resolved_at=v.resolved_at,
        created_at=v.created_at,
    )


@router.post("", response_model=ViolationOut)
def create_violation(
    payload: ViolationCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Manually logs or records an industrial safety violation."""
    v = Violation(
        camera_id=payload.camera_id,
        zone_id=payload.zone_id,
        worker_track_id=payload.worker_track_id,
        violation_type=payload.violation_type,
        severity=payload.severity,
        confidence=payload.confidence,
        bbox=json.dumps(payload.bbox) if payload.bbox else None,
        notes=payload.notes,
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "system",
        action="CREATE_VIOLATION",
        resource_type="violation",
        resource_id=v.id,
        details=f"Violation {v.violation_type} created for worker {v.worker_track_id}",
    )
    db.add(audit)
    db.commit()

    return ViolationOut(
        id=v.id,
        camera_id=v.camera_id,
        zone_id=v.zone_id,
        worker_track_id=v.worker_track_id,
        violation_type=v.violation_type,
        severity=v.severity,
        confidence=v.confidence,
        bbox=payload.bbox,
        snapshot_path=v.snapshot_path,
        evidence_url=v.evidence_url,
        notes=v.notes,
        acknowledged=v.acknowledged,
        acknowledged_by=v.acknowledged_by,
        resolved=v.resolved,
        resolved_by=v.resolved_by,
        resolved_at=v.resolved_at,
        created_at=v.created_at,
    )


def _delete_snapshot_file(path: Optional[str]):
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


@router.delete("/{violation_id}")
def delete_violation(
    violation_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Permanently deletes one violation and its snapshot file."""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")

    _delete_snapshot_file(v.snapshot_path)
    db.delete(v)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "system",
        action="DELETE_VIOLATION",
        resource_type="violation",
        resource_id=violation_id,
        details=f"Deleted violation {violation_id}",
    )
    db.add(audit)
    db.commit()

    return {"status": "deleted", "id": violation_id}


@router.delete("")
def clear_violations(
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Bulk clears filtered violations and snapshots."""
    q = db.query(Violation)
    if violation_type:
        q = q.filter(Violation.violation_type == violation_type)
    if severity:
        q = q.filter(Violation.severity == severity)
    if resolved is not None:
        q = q.filter(Violation.resolved == resolved)

    rows = q.all()
    for v in rows:
        _delete_snapshot_file(v.snapshot_path)
        db.delete(v)
    db.commit()
    return {"status": "cleared", "count": len(rows)}


@router.patch("/{violation_id}/acknowledge")
def acknowledge_violation(
    violation_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Acknowledges an active violation incident."""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")

    v.acknowledged = True
    v.acknowledged_by = current_user.email if current_user else "Safety Officer"
    db.commit()

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action="ACKNOWLEDGE_VIOLATION",
        resource_type="violation",
        resource_id=violation_id,
        details=f"Violation {violation_id} acknowledged by {v.acknowledged_by}",
    )
    db.add(audit)
    db.commit()

    return {"status": "acknowledged", "id": violation_id, "acknowledged_by": v.acknowledged_by}


@router.patch("/{violation_id}/resolve")
def resolve_violation(
    violation_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Resolves an incident with user attribution and timestamp."""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")

    v.resolved = True
    v.acknowledged = True
    v.resolved_by = current_user.email if current_user else "Safety Officer"
    v.resolved_at = datetime.now(timezone.utc)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action="RESOLVE_VIOLATION",
        resource_type="violation",
        resource_id=violation_id,
        details=f"Violation {violation_id} resolved by {v.resolved_by}",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "resolved",
        "id": violation_id,
        "resolved_by": v.resolved_by,
        "resolved_at": v.resolved_at.isoformat(),
    }


@router.get("/{violation_id}/snapshot")
def get_snapshot(violation_id: str, db: Session = Depends(get_db)):
    """Serves the camera capture snapshot for incident evidence."""
    v = db.query(Violation).filter(Violation.id == violation_id).first()
    if not v or not v.snapshot_path or not os.path.exists(v.snapshot_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Snapshot file not found")
    return FileResponse(v.snapshot_path)