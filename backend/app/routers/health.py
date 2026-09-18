"""
System Health and Readiness Router.
"""
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.detection.detector import detector
from app.state import START_TIME
from app.schemas import SystemHealth
from app.websocket_manager import alert_manager

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/live")
def liveness():
    """Liveness probe returning 200 if process is alive."""
    return {"status": "alive", "timestamp": time.time()}


@router.get("/ready")
def readiness(db: Session = Depends(get_db)):
    """Readiness probe checking database connectivity and model status."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}",
        )

    model_ok = detector.model is not None

    return {
        "status": "ready" if db_ok and model_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "model_loaded": model_ok,
    }


@router.get("/system", response_model=SystemHealth)
def system_vitals(db: Session = Depends(get_db)):
    """Provides comprehensive engine diagnostics and resource statistics."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    perf = detector.get_performance_stats()
    uptime = round(time.time() - START_TIME, 1)

    return SystemHealth(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        model_loaded=detector.model is not None,
        model_version=detector.model_version,
        device=detector.device,
        avg_latency_ms=perf.get("avg_latency_ms", 0.0),
        current_fps=perf.get("current_fps", 0.0),
        uptime_seconds=uptime,
        active_connections=len(alert_manager.active_connections),
    )
