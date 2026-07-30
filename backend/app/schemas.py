from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class ZoneCreate(BaseModel):
    camera_id: str
    name: str
    zone_type: str = "restricted"
    shape_type: str = "polygon"  # polygon | rectangle
    points: List[List[float]]


class ZoneOut(BaseModel):
    id: str
    camera_id: str
    name: str
    zone_type: str
    shape_type: str
    points: List[List[float]]
    created_at: datetime

    class Config:
        from_attributes = True


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
    acknowledged: bool
    resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class StatsSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    total_violations: int
    violations_today: int
    resolved_violations: int
    compliance_rate: float
    avg_confidence: float
    uptime_seconds: float
    model_name: str
    ppe_capable: bool
    by_type: dict
    by_severity: dict
    trend_last_7_days: List[dict]


class HeatmapCell(BaseModel):
    row: int
    col: int
    count: int


class InsightOut(BaseModel):
    id: str
    title: str
    message: str
    severity: str


class CameraCreate(BaseModel):
    name: str
    location: Optional[str] = None


class CameraOut(BaseModel):
    id: str
    name: str
    location: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True