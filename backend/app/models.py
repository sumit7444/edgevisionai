import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Text, ForeignKey
from app.database import Base


def gen_id():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="safety_officer")  # admin | safety_officer | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    source_type = Column(String, default="local")  # local | remote
    is_active = Column(Boolean, default=True)
    status = Column(String, default="online")  # online | offline
    fps = Column(Float, default=15.0)
    resolution = Column(String, default="1280x720")
    created_at = Column(DateTime, default=utc_now)


class Zone(Base):
    __tablename__ = "zones"

    id = Column(String, primary_key=True, default=gen_id)
    camera_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    zone_type = Column(String, default="restricted")  # restricted | ppe_required
    shape_type = Column(String, default="polygon")  # polygon | rectangle
    points = Column(Text, nullable=False)  # JSON list [[x,y],...] normalized 0-1
    rules = Column(Text, nullable=True)  # JSON dict of specific rules (e.g. required PPE, max speed)
    created_at = Column(DateTime, default=utc_now)


class Worker(Base):
    __tablename__ = "workers"

    id = Column(String, primary_key=True, default=gen_id)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, default="Operations")
    status = Column(String, default="safe")  # safe | in_violation | offline
    assigned_zone_id = Column(String, nullable=True)
    active_track_id = Column(String, nullable=True)
    last_seen = Column(DateTime, default=utc_now)
    created_at = Column(DateTime, default=utc_now)


class Violation(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True, default=gen_id)
    camera_id = Column(String, nullable=True, index=True)
    zone_id = Column(String, nullable=True)
    worker_track_id = Column(String, nullable=True, index=True)
    violation_type = Column(String, nullable=False, index=True)  # no_hardhat | no_vest | zone_intrusion | fall_risk | proximity_risk
    severity = Column(String, default="medium", index=True)  # low | medium | high | critical
    confidence = Column(Float, default=0.0)
    bbox = Column(Text, nullable=True)  # JSON string [x1,y1,x2,y2], normalized 0-1
    snapshot_path = Column(String, nullable=True)
    evidence_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_by = Column(String, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_id)
    violation_id = Column(String, nullable=True, index=True)
    camera_id = Column(String, nullable=True, index=True)
    severity = Column(String, default="high", index=True)  # critical | high | medium | low
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, index=True)
    resolved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=utc_now, index=True)


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String, primary_key=True, default=gen_id)
    camera_id = Column(String, nullable=False, index=True)
    class_name = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    bbox = Column(Text, nullable=True)  # JSON string
    worker_track_id = Column(String, nullable=True)
    frame_id = Column(Integer, default=0)
    timestamp = Column(DateTime, default=utc_now, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, nullable=True, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)  # e.g., "LOGIN", "ACKNOWLEDGE_VIOLATION", "CREATE_ZONE"
    resource_type = Column(String, nullable=True)  # e.g., "violation", "zone", "camera", "auth"
    resource_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)