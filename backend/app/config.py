import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edgevision.db")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "yolov8n.pt")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    SNAPSHOT_DIR: str = os.getenv("SNAPSHOT_DIR", "snapshots")


settings = Settings()
os.makedirs(settings.SNAPSHOT_DIR, exist_ok=True)
