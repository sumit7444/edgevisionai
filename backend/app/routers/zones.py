import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Zone
from app.schemas import ZoneCreate, ZoneOut

router = APIRouter(prefix="/api/zones", tags=["zones"])


@router.post("", response_model=ZoneOut)
def create_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    z = Zone(
        camera_id=zone.camera_id,
        name=zone.name,
        zone_type=zone.zone_type,
        shape_type=zone.shape_type,
        points=json.dumps(zone.points),
    )
    db.add(z)
    db.commit()
    db.refresh(z)
    return ZoneOut(
        id=z.id,
        camera_id=z.camera_id,
        name=z.name,
        zone_type=z.zone_type,
        shape_type=z.shape_type,
        points=json.loads(z.points),
        created_at=z.created_at,
    )


@router.get("", response_model=list[ZoneOut])
def list_zones(camera_id: str, db: Session = Depends(get_db)):
    rows = db.query(Zone).filter(Zone.camera_id == camera_id).all()
    return [
        ZoneOut(
            id=r.id,
            camera_id=r.camera_id,
            name=r.name,
            zone_type=r.zone_type,
            shape_type=r.shape_type,
            points=json.loads(r.points),
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete("/{zone_id}")
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    db.query(Zone).filter(Zone.id == zone_id).delete()
    db.commit()
    return {"status": "deleted"}
