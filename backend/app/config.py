import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edgevision.db")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "best.pt" if os.path.exists("best.pt") else "yolov8n.pt")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "v1.2.0-yolov8-industrial")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    IOU_THRESHOLD: float = float(os.getenv("IOU_THRESHOLD", "0.45"))
    NMS_THRESHOLD: float = float(os.getenv("NMS_THRESHOLD", "0.50"))
    DEVICE: str = os.getenv("DEVICE", "auto")  # auto | cuda | mps | cpu
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    SNAPSHOT_DIR: str = os.getenv("SNAPSHOT_DIR", "snapshots")
    
    # Auth & Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "edgevision-enterprise-safety-secret-key-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Safety Rules Thresholds
    PROXIMITY_THRESHOLD: float = float(os.getenv("PROXIMITY_THRESHOLD", "0.12"))  # Normalized frame distance
    FALL_ASPECT_RATIO_THRESHOLD: float = float(os.getenv("FALL_ASPECT_RATIO_THRESHOLD", "0.75"))  # w/h ratio
    VIOLATION_COOLDOWN_SECONDS: int = int(os.getenv("VIOLATION_COOLDOWN_SECONDS", "8"))


settings = Settings()
os.makedirs(settings.SNAPSHOT_DIR, exist_ok=True)

