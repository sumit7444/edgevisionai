import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import User, Camera, Worker
from app.auth import hash_password
from app.routers import (
    auth,
    cameras,
    workers,
    alerts,
    audit,
    health,
    violations,
    zones,
    stats,
    stream,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("edgevision")

# Initialize database schema
Base.metadata.create_all(bind=engine)


def seed_default_data():
    """Seeds default administrative accounts and sample resources for out-of-the-box readiness."""
    db = SessionLocal()
    try:
        # Seed default admin
        admin_email = "admin@edgevision.ai"
        if not db.query(User).filter(User.email == admin_email).first():
            admin_user = User(
                email=admin_email,
                hashed_password=hash_password("Admin@123456"),
                full_name="System Administrator",
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            logger.info(f"Seeded default admin account: {admin_email}")

        # Seed default safety officer
        officer_email = "officer@edgevision.ai"
        if not db.query(User).filter(User.email == officer_email).first():
            officer_user = User(
                email=officer_email,
                hashed_password=hash_password("Safety@123456"),
                full_name="Chief Safety Officer",
                role="safety_officer",
                is_active=True,
            )
            db.add(officer_user)
            logger.info(f"Seeded default safety officer account: {officer_email}")

        # Seed default camera if none exists
        if db.query(Camera).count() == 0:
            default_cam = Camera(
                id="cam-01",
                name="Shop Floor North (Zone A)",
                location="Fabrication Bay 1",
                source_type="local",
                is_active=True,
                status="online",
            )
            db.add(default_cam)
            logger.info("Seeded default camera: cam-01")

        # Seed sample workers if none exist
        if db.query(Worker).count() == 0:
            workers = [
                Worker(employee_id="EMP-101", name="Marcus Vance", department="Assembly", status="safe"),
                Worker(employee_id="EMP-102", name="Elena Rostova", department="Welding", status="safe"),
                Worker(employee_id="EMP-103", name="David Kim", department="Logistics", status="safe"),
            ]
            db.add_all(workers)
            logger.info(f"Seeded {len(workers)} sample workers")

        db.commit()
    except Exception as e:
        logger.error(f"Error during startup data seeding: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting EdgeVision AI Backend Engine...")
    seed_default_data()
    yield
    # Shutdown
    logger.info("Shutting down EdgeVision AI Backend Engine...")


app = FastAPI(
    title="EdgeVision AI",
    description="Real-Time Industrial Worker Safety Monitoring Platform",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred. Please contact support."},
    )

app.mount("/snapshots", StaticFiles(directory=settings.SNAPSHOT_DIR), name="snapshots")

# Register all modular routers
app.include_router(auth.router)
app.include_router(cameras.router)
app.include_router(workers.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(health.router)
app.include_router(violations.router)
app.include_router(zones.router)
app.include_router(stats.router)
app.include_router(stream.router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "EdgeVision AI Industrial Safety Platform",
        "version": "1.2.0",
    }


@app.get("/health")
def legacy_health():
    return {"status": "healthy"}
