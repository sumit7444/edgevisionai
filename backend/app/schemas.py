from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime


# =====================
# AUTH & USER SCHEMAS
# =====================
class UserLogin(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "safety_officer"  # admin | safety_officer | viewer


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# =====================
# CAMERA SCHEMAS
# =====================
class CameraCreate(BaseModel):
    id: Optional[str] = None
    name: str
    location: Optional[str] = None
    source_type: str = "local"  # local | remote
    fps: Optional[float] = 15.0
    resolution: Optional[str] = "1280x720"


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    source_type: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    fps: Optional[float] = None
    resolution: Optional[str] = None


class CameraOut(BaseModel):
    id: str
    name: str
    location: Optional[str]
    source_type: str
    is_active: bool
    status: str
    fps: float
    resolution: str
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# ZONE SCHEMAS
# =====================
class ZoneCreate(BaseModel):
    camera_id: str
    name: str
    zone_type: str = "restricted"  # restricted | ppe_required
    shape_type: str = "polygon"    # polygon | rectangle
    points: List[List[float]]
    rules: Optional[Dict[str, Any]] = None


class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    shape_type: Optional[str] = None
    points: Optional[List[List[float]]] = None
    rules: Optional[Dict[str, Any]] = None


class ZoneOut(BaseModel):
    id: str
    camera_id: str
    name: str
    zone_type: str
    shape_type: str
    points: List[List[float]]
    rules: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# WORKER SCHEMAS
# =====================
class WorkerCreate(BaseModel):
    employee_id: str
    name: str
    department: str = "Operations"
    assigned_zone_id: Optional[str] = None


class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    assigned_zone_id: Optional[str] = None


class WorkerOut(BaseModel):
    id: str
    employee_id: str
    name: str
    department: str
    status: str
    assigned_zone_id: Optional[str]
    active_track_id: Optional[str]
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# VIOLATION SCHEMAS
# =====================
class ViolationCreate(BaseModel):
    camera_id: Optional[str] = None
    zone_id: Optional[str] = None
    worker_track_id: Optional[str] = None
    violation_type: str
    severity: str = "medium"
    confidence: float = 0.0
    bbox: Optional[List[float]] = None
    notes: Optional[str] = None


class ViolationOut(BaseModel):
    id: str
    camera_id: Optional[str]
    zone_id: Optional[str]
    worker_track_id: Optional[str]
    violation_type: str
    severity: str
    confidence: float
    bbox: Optional[List[float]]
    snapshot_path: Optional[str]
    evidence_url: Optional[str] = None
    notes: Optional[str] = None
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# ALERT SCHEMAS
# =====================
class AlertCreate(BaseModel):
    violation_id: Optional[str] = None
    camera_id: Optional[str] = None
    severity: str = "high"
    title: str
    message: str


class AlertOut(BaseModel):
    id: str
    violation_id: Optional[str]
    camera_id: Optional[str]
    severity: str
    title: str
    message: str
    acknowledged: bool
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# AUDIT LOG SCHEMAS
# =====================
class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
# STATS & DASHBOARD SCHEMAS
# =====================
class StatsSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    total_violations: int
    violations_today: int
    resolved_violations: int
    active_violations: int
    compliance_rate: float
    avg_confidence: float
    uptime_seconds: float
    model_name: str
    model_version: str
    ppe_capable: bool
    active_cameras_count: int
    total_workers_count: int
    safe_workers_count: int
    by_type: dict
    by_severity: dict
    trend_last_7_days: List[dict]


class HeatmapCell(BaseModel):
    row: int
    col: int
    count: int


class ZoneStat(BaseModel):
    zone_id: Optional[str]
    zone_name: str
    total: int
    by_type: dict


class InsightOut(BaseModel):
    id: str
    title: str
    message: str
    severity: str


# =====================
# SYSTEM HEALTH SCHEMAS
# =====================
class SystemHealth(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    database: str
    model_loaded: bool
    model_version: str
    device: str
    avg_latency_ms: float
    current_fps: float
    uptime_seconds: float
    active_connections: int