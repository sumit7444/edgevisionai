"""
Camera Management Router.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Camera, Zone, Violation, AuditLog, User
from app.schemas import CameraCreate, CameraUpdate, CameraOut
from app.auth import get_optional_current_user, require_roles
from app.viewer_hub import viewer_hub

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraOut])
def list_cameras(active_only: bool = False, db: Session = Depends(get_db)):
    """Lists all configured cameras."""
    q = db.query(Camera)
    if active_only:
        q = q.filter(Camera.is_active.is_(True))
    return [CameraOut.model_validate(c) for c in q.all()]


@router.post("", response_model=CameraOut)
def create_camera(
    cam: CameraCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new camera or returns existing if ID specified."""
    if cam.id:
        existing = db.query(Camera).filter(Camera.id == cam.id).first()
        if existing:
            return CameraOut.model_validate(existing)

    c = Camera(
        id=cam.id if cam.id else f"cam-{uuid.uuid4().hex[:6]}",
        name=cam.name,
        location=cam.location,
        source_type=cam.source_type,
        fps=cam.fps or 15.0,
        resolution=cam.resolution or "1280x720",
        status="online",
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "anonymous",
        action="CREATE_CAMERA",
        resource_type="camera",
        resource_id=c.id,
        details=f"Camera '{c.name}' registered with ID {c.id}",
    )
    db.add(audit)
    db.commit()

    return CameraOut.model_validate(c)


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    """Gets details of a single camera."""
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    return CameraOut.model_validate(c)


@router.put("/{camera_id}", response_model=CameraOut)
def update_camera(
    camera_id: str,
    payload: CameraUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Updates camera parameters."""
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(c, field, value)

    db.commit()
    db.refresh(c)
    return CameraOut.model_validate(c)


@router.patch("/{camera_id}/status", response_model=CameraOut)
def set_camera_status(
    camera_id: str,
    status_value: str,
    db: Session = Depends(get_db),
):
    """Updates camera operational status (online / offline / degraded)."""
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    c.status = status_value
    db.commit()
    db.refresh(c)
    return CameraOut.model_validate(c)


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a camera, its associated zones, and unlinks it."""
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    db.query(Zone).filter(Zone.camera_id == camera_id).delete()
    db.delete(c)
    db.commit()

    return {"status": "deleted", "camera_id": camera_id}


@router.get("/{camera_id}/health")
def get_camera_health(camera_id: str, db: Session = Depends(get_db)):
    """Returns streaming health status and connected viewer count for a camera."""
    c = db.query(Camera).filter(Camera.id == camera_id).first()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    viewers = viewer_hub.viewer_count(camera_id)
    recent_violations = db.query(Violation).filter(Violation.camera_id == camera_id).count()

    return {
        "camera_id": c.id,
        "name": c.name,
        "status": c.status,
        "is_active": c.is_active,
        "source_type": c.source_type,
        "active_viewers": viewers,
        "total_violations_recorded": recent_violations,
    }
