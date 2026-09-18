"""
Comprehensive Backend Integration and Unit Tests for EdgeVision AI.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.auth import hash_password, verify_password, create_access_token
from app.models import User, Camera, Worker, Zone, Violation, Alert

# Use in-memory SQLite for rapid, isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_edgevision.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_database():
    # Setup test admin and officer
    db = TestingSessionLocal()
    admin = User(
        id="usr-admin",
        email="admin@test.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Test Admin",
        role="admin",
        is_active=True,
    )
    officer = User(
        id="usr-officer",
        email="officer@test.com",
        hashed_password=hash_password("Pass123!"),
        full_name="Test Officer",
        role="safety_officer",
        is_active=True,
    )
    db.add(admin)
    db.add(officer)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def test_password_hashing():
    pw = "SecurePassword123!"
    hashed = hash_password(pw)
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_auth_login_and_me():
    # Invalid password
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "wrong"})
    assert res.status_code == 401

    # Valid login
    res = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "Pass123!"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]
    assert data["user"]["email"] == "admin@test.com"

    # Authenticated /me
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "admin"


def test_cameras_crud():
    # Create camera
    res = client.post("/api/cameras", json={
        "id": "cam-test-1",
        "name": "Assembly Line East",
        "location": "Sector 4",
        "source_type": "local",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Assembly Line East"

    # List cameras
    list_res = client.get("/api/cameras")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Camera health
    health_res = client.get("/api/cameras/cam-test-1/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "online"


def test_workers_crud():
    # Create worker
    res = client.post("/api/workers", json={
        "employee_id": "W-8899",
        "name": "Frank Miller",
        "department": "Quality",
    })
    assert res.status_code == 200
    assert res.json()["name"] == "Frank Miller"

    # List workers
    w_list = client.get("/api/workers")
    assert w_list.status_code == 200
    assert any(w["employee_id"] == "W-8899" for w in w_list.json())


def test_zones_crud():
    # Create zone
    res = client.post("/api/zones", json={
        "camera_id": "cam-test-1",
        "name": "Robotics Danger Perimeter",
        "zone_type": "restricted",
        "shape_type": "polygon",
        "points": [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5], [0.1, 0.5]],
        "rules": {"required_ppe": ["hardhat", "vest"], "max_dwell_sec": 30},
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Robotics Danger Perimeter"
    zone_id = data["id"]

    # List zones
    z_list = client.get("/api/zones?camera_id=cam-test-1")
    assert z_list.status_code == 200
    assert len(z_list.json()) >= 1


def test_violations_and_alerts():
    # Create violation
    v_res = client.post("/api/violations", json={
        "camera_id": "cam-test-1",
        "worker_track_id": "W-8899",
        "violation_type": "no_hardhat",
        "severity": "high",
        "confidence": 0.89,
    })
    assert v_res.status_code == 200
    v_data = v_res.json()
    v_id = v_data["id"]

    # Create alert for violation
    a_res = client.post("/api/alerts", json={
        "violation_id": v_id,
        "camera_id": "cam-test-1",
        "severity": "high",
        "title": "Missing Hardhat Detected",
        "message": "Worker W-8899 detected without required hardhat in Sector 4.",
    })
    assert a_res.status_code == 200
    a_id = a_res.json()["id"]

    # Check unread count
    u_res = client.get("/api/alerts/unread-count")
    assert u_res.status_code == 200
    assert u_res.json()["unacknowledged_count"] >= 1

    # Acknowledge alert
    ack_res = client.patch(f"/api/alerts/{a_id}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["acknowledged"] is True

    # Resolve violation
    res_violation = client.patch(f"/api/violations/{v_id}/resolve")
    assert res_violation.status_code == 200
    assert res_violation.json()["status"] == "resolved"


def test_dashboard_stats_and_health():
    # Summary stats
    stats_res = client.get("/api/stats/summary")
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert "total_violations" in data
    assert "compliance_rate" in data
    assert "active_cameras_count" in data

    # Heatmap
    hm_res = client.get("/api/stats/heatmap")
    assert hm_res.status_code == 200
    assert len(hm_res.json()) == 24  # 4 rows * 6 cols

    # Safety Insights
    ins_res = client.get("/api/insights")
    assert ins_res.status_code == 200
    assert isinstance(ins_res.json(), list)

    # Health system
    sys_res = client.get("/api/health/system")
    assert sys_res.status_code == 200
    assert sys_res.json()["database"] == "connected"
