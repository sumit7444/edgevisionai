import time
import uuid
import json
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Violation, Camera
from app.schemas import StatsSummary, CameraCreate, CameraOut, HeatmapCell, InsightOut
from app.detection.detector import detector
from app.state import START_TIME
from app.config import settings

router = APIRouter(tags=["stats"])

HEATMAP_ROWS = 4
HEATMAP_COLS = 6


@router.get("/api/stats/summary", response_model=StatsSummary)
def stats_summary(db: Session = Depends(get_db)):
    total = db.query(Violation).count()
    resolved_total = db.query(Violation).filter(Violation.resolved.is_(True)).count()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(Violation).filter(Violation.created_at >= today_start).count()

    by_type = defaultdict(int)
    by_severity = defaultdict(int)
    confidences = []
    for v in db.query(Violation).all():
        by_type[v.violation_type] += 1
        by_severity[v.severity] += 1
        confidences.append(v.confidence)

    trend = []
    for i in range(6, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        count = db.query(Violation).filter(
            Violation.created_at >= day, Violation.created_at < next_day
        ).count()
        trend.append({"date": day.strftime("%b %d"), "violations": count})

    # naive compliance rate: fewer violations relative to a rolling baseline reads as higher compliance
    compliance_rate = max(0.0, round(100 - min(today_count * 2, 100), 1))
    avg_confidence = round(sum(confidences) / len(confidences) * 100, 1) if confidences else 0.0

    return StatsSummary(
        total_violations=total,
        violations_today=today_count,
        resolved_violations=resolved_total,
        compliance_rate=compliance_rate,
        avg_confidence=avg_confidence,
        uptime_seconds=round(time.time() - START_TIME, 0),
        model_name=settings.MODEL_PATH,
        ppe_capable=detector.ppe_capable,
        by_type=dict(by_type),
        by_severity=dict(by_severity),
        trend_last_7_days=trend,
    )


@router.get("/api/stats/heatmap", response_model=list[HeatmapCell])
def stats_heatmap(db: Session = Depends(get_db)):
    """Buckets violation bbox centers (stored normalized 0-1) into a coarse grid."""
    grid = defaultdict(int)
    for v in db.query(Violation).filter(Violation.bbox.isnot(None)).all():
        try:
            x1, y1, x2, y2 = json.loads(v.bbox)
        except Exception:
            continue
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        col = min(HEATMAP_COLS - 1, max(0, int(cx * HEATMAP_COLS)))
        row = min(HEATMAP_ROWS - 1, max(0, int(cy * HEATMAP_ROWS)))
        grid[(row, col)] += 1

    cells = []
    for row in range(HEATMAP_ROWS):
        for col in range(HEATMAP_COLS):
            cells.append(HeatmapCell(row=row, col=col, count=grid.get((row, col), 0)))
    return cells


@router.get("/api/insights", response_model=list[InsightOut])
def safety_insights(db: Session = Depends(get_db)):
    """
    Rule-based safety recommendations derived from recent violation stats.
    Not a language model — straightforward thresholds over the numbers, kept
    honest and explainable rather than dressed up as deep analysis.
    """
    insights = []
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    today_count = db.query(Violation).filter(Violation.created_at >= today_start).count()
    yesterday_count = db.query(Violation).filter(
        Violation.created_at >= yesterday_start, Violation.created_at < today_start
    ).count()

    by_type = defaultdict(int)
    for v in db.query(Violation).filter(Violation.created_at >= today_start).all():
        by_type[v.violation_type] += 1

    if yesterday_count > 0 and today_count > yesterday_count * 1.3:
        pct = round((today_count - yesterday_count) / yesterday_count * 100)
        insights.append(
            InsightOut(
                id=str(uuid.uuid4()),
                title="Violations trending up",
                message=f"Today's violation count is {pct}% higher than yesterday. Consider a floor walk or toolbox talk before the next shift.",
                severity="high",
            )
        )

    if by_type:
        top_type, top_count = max(by_type.items(), key=lambda kv: kv[1])
        if top_count >= 3:
            label = top_type.replace("_", " ")
            insights.append(
                InsightOut(
                    id=str(uuid.uuid4()),
                    title=f"{label.title()} is the leading issue today",
                    message=f"{top_count} {label} incidents logged today. Check signage and PPE availability near the affected zone.",
                    severity="medium",
                )
            )

    unresolved = db.query(Violation).filter(Violation.resolved.is_(False)).count()
    if unresolved >= 5:
        insights.append(
            InsightOut(
                id=str(uuid.uuid4()),
                title="Unresolved incidents piling up",
                message=f"{unresolved} violations are still unresolved. Review the Violation Log and clear or acknowledge outstanding items.",
                severity="medium",
            )
        )

    if not insights:
        insights.append(
            InsightOut(
                id=str(uuid.uuid4()),
                title="Site looks compliant",
                message="No significant violation patterns detected in the recent data. Keep up current safety practices.",
                severity="low",
            )
        )

    return insights


@router.post("/api/cameras", response_model=CameraOut)
def create_camera(cam: CameraCreate, db: Session = Depends(get_db)):
    c = Camera(name=cam.name, location=cam.location)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/api/cameras", response_model=list[CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).all()
