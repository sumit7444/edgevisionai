import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Text
from app.database import Base


def gen_id():
    return str(uuid.uuid4())


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Zone(Base):
    __tablename__ = "zones"

    id = Column(String, primary_key=True, default=gen_id)
    camera_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    zone_type = Column(String, default="restricted")  # restricted | ppe_required
    shape_type = Column(String, default="polygon")  # polygon | rectangle
    # polygon points stored as JSON string: [[x,y],[x,y],...] normalized 0-1
    points = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Violation(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True, default=gen_id)
    camera_id = Column(String, nullable=True)
    zone_id = Column(String, nullable=True)
    worker_track_id = Column(String, nullable=True)
    violation_type = Column(String, nullable=False)  # no_hardhat | no_vest | zone_intrusion
    severity = Column(String, default="medium")  # low | medium | high | critical
    confidence = Column(Float, default=0.0)
    bbox = Column(Text, nullable=True)  # JSON string [x1,y1,x2,y2], normalized 0-1
    snapshot_path = Column(String, nullable=True)
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
