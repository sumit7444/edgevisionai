"""
Worker Management Router.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Worker, Violation, AuditLog, User
from app.schemas import WorkerCreate, WorkerUpdate, WorkerOut, ViolationOut
from app.auth import get_optional_current_user

router = APIRouter(prefix="/api/workers", tags=["workers"])


@router.get("", response_model=list[WorkerOut])
def list_workers(
    status: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lists registered site workers."""
    q = db.query(Worker)
    if status:
        q = q.filter(Worker.status == status)
    if department:
        q = q.filter(Worker.department == department)
    return [WorkerOut.model_validate(w) for w in q.all()]


@router.post("", response_model=WorkerOut)
def create_worker(
    worker_data: WorkerCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Enrolls a new industrial worker in the safety monitoring system."""
    existing = db.query(Worker).filter(Worker.employee_id == worker_data.employee_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker with Employee ID '{worker_data.employee_id}' already exists.",
        )

    w = Worker(
        employee_id=worker_data.employee_id,
        name=worker_data.name,
        department=worker_data.department,
        assigned_zone_id=worker_data.assigned_zone_id,
        status="safe",
    )
    db.add(w)
    db.commit()
    db.refresh(w)

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "system",
        action="CREATE_WORKER",
        resource_type="worker",
        resource_id=w.id,
        details=f"Worker '{w.name}' ({w.employee_id}) enrolled.",
    )
    db.add(audit)
    db.commit()

    return WorkerOut.model_validate(w)


@router.get("/{worker_id}", response_model=WorkerOut)
def get_worker(worker_id: str, db: Session = Depends(get_db)):
    """Gets details for a single worker."""
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    return WorkerOut.model_validate(w)


@router.put("/{worker_id}", response_model=WorkerOut)
def update_worker(
    worker_id: str,
    payload: WorkerUpdate,
    db: Session = Depends(get_db),
):
    """Updates worker details or zone assignment."""
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(w, field, val)

    db.commit()
    db.refresh(w)
    return WorkerOut.model_validate(w)


@router.delete("/{worker_id}")
def delete_worker(worker_id: str, db: Session = Depends(get_db)):
    """Deletes a worker record."""
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    db.delete(w)
    db.commit()
    return {"status": "deleted", "worker_id": worker_id}


@router.get("/{worker_id}/violations")
def get_worker_violations(worker_id: str, db: Session = Depends(get_db)):
    """Returns violation history associated with a worker."""
    w = db.query(Worker).filter(Worker.id == worker_id).first()
    if not w:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    # Match by active_track_id or employee_id
    rows = db.query(Violation).filter(
        (Violation.worker_track_id == w.employee_id) |
        (Violation.worker_track_id == w.active_track_id)
    ).all()

    return [
        {
            "id": r.id,
            "violation_type": r.violation_type,
            "severity": r.severity,
            "created_at": r.created_at,
            "resolved": r.resolved,
            "confidence": r.confidence,
        }
        for r in rows
    ]
