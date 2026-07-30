from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine
from app.routers import violations, zones, stats, stream

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EdgeVision AI", description="Real-Time Industrial Worker Safety Monitoring System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/snapshots", StaticFiles(directory=settings.SNAPSHOT_DIR), name="snapshots")

app.include_router(violations.router)
app.include_router(zones.router)
app.include_router(stats.router)
app.include_router(stream.router)


@app.get("/")
def root():
    return {"status": "online", "service": "EdgeVision AI"}


@app.get("/health")
def health():
    return {"status": "healthy"}
