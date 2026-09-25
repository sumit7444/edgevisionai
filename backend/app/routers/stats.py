import time
import uuid
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Violation, Camera, Zone, Worker
from app.schemas import StatsSummary, HeatmapCell, InsightOut, ZoneStat
from app.detection.detector import detector
from app.state import START_TIME
from app.config import settings

router = APIRouter(tags=["stats"])

HEATMAP_ROWS = 4
HEATMAP_COLS = 6


@router.get("/api/stats/summary", response_model=StatsSummary)
def stats_summary(timeframe: str = Query("7d"), db: Session = Depends(get_db)):
    """Provides high-level KPI safety summary across workers, cameras, and violations."""
    total = db.query(Violation).count()
    resolved_total = db.query(Violation).filter(Violation.resolved.is_(True)).count()
    active_violations = db.query(Violation).filter(Violation.resolved.is_(False)).count()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(Violation).filter(Violation.created_at >= today_start).count()

    active_cameras_count = db.query(Camera).filter(Camera.is_active.is_(True)).count()
    total_workers_count = db.query(Worker).count()
    safe_workers_count = db.query(Worker).filter(Worker.status == "safe").count()

    # Determine trend days based on timeframe
    days_back = 30 if timeframe == "30d" else (14 if timeframe == "14d" else 7)

    by_type = defaultdict(int)
    by_severity = defaultdict(int)
    confidences = []
    
    for v in db.query(Violation).all():
        by_type[v.violation_type] += 1
        by_severity[v.severity] += 1
        if v.confidence:
            confidences.append(v.confidence)

    trend = []
    for i in range(days_back - 1, -1, -1):
        day = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        next_day = day + timedelta(days=1)
        count = db.query(Violation).filter(
            Violation.created_at >= day, Violation.created_at < next_day
        ).count()
        trend.append({"date": day.strftime("%b %d"), "violations": count})

    # Normalized compliance rate
    compliance_rate = max(0.0, round(100 - min(active_violations * 3, 100), 1))
    avg_confidence = round(sum(confidences) / len(confidences) * 100, 1) if confidences else 0.0

    return StatsSummary(
        total_violations=total,
        violations_today=today_count,
        resolved_violations=resolved_total,
        active_violations=active_violations,
        compliance_rate=compliance_rate,
        avg_confidence=avg_confidence,
        uptime_seconds=round(time.time() - START_TIME, 0),
        model_name=settings.MODEL_PATH,
        model_version=detector.model_version,
        ppe_capable=detector.ppe_capable,
        active_cameras_count=active_cameras_count,
        total_workers_count=total_workers_count,
        safe_workers_count=safe_workers_count,
        by_type=dict(by_type),
        by_severity=dict(by_severity),
        trend_last_7_days=trend,
    )


@router.get("/api/stats/by-zone", response_model=list[ZoneStat])
def stats_by_zone(db: Session = Depends(get_db)):
    """Violation counts grouped by the zone they occurred in."""
    zones_by_id = {z.id: z.name for z in db.query(Zone).all()}
    grouped = defaultdict(lambda: defaultdict(int))

    for v in db.query(Violation).all():
        key = v.zone_id or "unzoned"
        grouped[key][v.violation_type] += 1

    results = []
    for zone_id, by_type in grouped.items():
        results.append(
            ZoneStat(
                zone_id=None if zone_id == "unzoned" else zone_id,
                zone_name=zones_by_id.get(zone_id, "Unzoned") if zone_id != "unzoned" else "Unzoned",
                total=sum(by_type.values()),
                by_type=dict(by_type),
            )
        )
    results.sort(key=lambda r: r.total, reverse=True)
    return results


@router.get("/api/stats/heatmap", response_model=list[HeatmapCell])
def stats_heatmap(db: Session = Depends(get_db)):
    """Buckets violation bbox centers (normalized 0-1) into a coarse grid."""
    grid = defaultdict(int)
    for v in db.query(Violation).filter(Violation.bbox.isnot(None)).all():
        try:
            coords = json.loads(v.bbox)
            if len(coords) == 4:
                x1, y1, x2, y2 = coords
                cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
                col = min(HEATMAP_COLS - 1, max(0, int(cx * HEATMAP_COLS)))
                row = min(HEATMAP_ROWS - 1, max(0, int(cy * HEATMAP_ROWS)))
                grid[(row, col)] += 1
        except Exception:
            continue

    cells = []
    for row in range(HEATMAP_ROWS):
        for col in range(HEATMAP_COLS):
            cells.append(HeatmapCell(row=row, col=col, count=grid.get((row, col), 0)))
    return cells


@router.get("/api/insights", response_model=list[InsightOut])
def safety_insights(db: Session = Depends(get_db)):
    """Rule-based safety recommendations derived from recent violation stats."""
    insights = []
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
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