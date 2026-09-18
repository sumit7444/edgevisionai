import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Zone, AuditLog, User
from app.schemas import ZoneCreate, ZoneUpdate, ZoneOut
from app.auth import get_optional_current_user

router = APIRouter(prefix="/api/zones", tags=["zones"])


@router.post("", response_model=ZoneOut)
def create_zone(
    zone: ZoneCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new safety zone (restricted or PPE-required polygon/rectangle)."""
    z = Zone(
        camera_id=zone.camera_id,
        name=zone.name,
        zone_type=zone.zone_type,
        shape_type=zone.shape_type,
        points=json.dumps(zone.points),
        rules=json.dumps(zone.rules) if zone.rules else None,
    )
    db.add(z)
    db.commit()
    db.refresh(z)

    audit = AuditLog(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else "system",
        action="CREATE_ZONE",
        resource_type="zone",
        resource_id=z.id,
        details=f"Zone '{z.name}' ({z.zone_type}) created on camera {z.camera_id}",
    )
    db.add(audit)
    db.commit()

    return ZoneOut(
        id=z.id,
        camera_id=z.camera_id,
        name=z.name,
        zone_type=z.zone_type,
        shape_type=z.shape_type,
        points=json.loads(z.points),
        rules=json.loads(z.rules) if z.rules else None,
        created_at=z.created_at,
    )


@router.get("", response_model=list[ZoneOut])
def list_zones(camera_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists safety zones, optionally filtered by camera ID."""
    q = db.query(Zone)
    if camera_id:
        q = q.filter(Zone.camera_id == camera_id)
    rows = q.all()
    return [
        ZoneOut(
            id=r.id,
            camera_id=r.camera_id,
            name=r.name,
            zone_type=r.zone_type,
            shape_type=r.shape_type,
            points=json.loads(r.points),
            rules=json.loads(r.rules) if r.rules else None,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/{zone_id}", response_model=ZoneOut)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    """Gets details for a single zone."""
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    return ZoneOut(
        id=z.id,
        camera_id=z.camera_id,
        name=z.name,
        zone_type=z.zone_type,
        shape_type=z.shape_type,
        points=json.loads(z.points),
        rules=json.loads(z.rules) if z.rules else None,
        created_at=z.created_at,
    )


@router.put("/{zone_id}", response_model=ZoneOut)
def update_zone(zone_id: str, payload: ZoneUpdate, db: Session = Depends(get_db)):
    """Updates safety zone geometry or rules."""
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")

    if payload.name is not None:
        z.name = payload.name
    if payload.zone_type is not None:
        z.zone_type = payload.zone_type
    if payload.shape_type is not None:
        z.shape_type = payload.shape_type
    if payload.points is not None:
        z.points = json.dumps(payload.points)
    if payload.rules is not None:
        z.rules = json.dumps(payload.rules)

    db.commit()
    db.refresh(z)
    return ZoneOut(
        id=z.id,
        camera_id=z.camera_id,
        name=z.name,
        zone_type=z.zone_type,
        shape_type=z.shape_type,
        points=json.loads(z.points),
        rules=json.loads(z.rules) if z.rules else None,
        created_at=z.created_at,
    )


@router.delete("/{zone_id}")
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    """Deletes a safety zone."""
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    db.delete(z)
    db.commit()
    return {"status": "deleted", "zone_id": zone_id}
