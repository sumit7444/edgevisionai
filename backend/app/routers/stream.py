import base64
import json
import time

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.database import SessionLocal
from app.models import Violation, Zone
from app.detection.detector import detector, SEVERITY_MAP
from app.detection.zones import check_zone_intrusions, find_zone_for_bbox
from app.detection.tracker import WorkerTracker
from app.websocket_manager import alert_manager
from app.viewer_hub import viewer_hub
from app.config import settings

router = APIRouter()

# Simple per-connection cooldown so the same ongoing violation doesn't spam the DB
VIOLATION_COOLDOWN_SECONDS = 8


def decode_frame(data_url: str):
    header, encoded = data_url.split(",", 1)
    img_bytes = base64.b64decode(encoded)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return frame


def save_snapshot(frame, violation_id):
    path = f"{settings.SNAPSHOT_DIR}/{violation_id}.jpg"
    cv2.imwrite(path, frame)
    return path


def normalize_bbox(bbox, w, h):
    x1, y1, x2, y2 = bbox
    return [round(x1 / w, 4), round(y1 / h, 4), round(x2 / w, 4), round(y2 / h, 4)]


def nearest_worker_id(bbox, workers):
    """Associate a PPE-violation box with the closest currently-tracked worker, by center distance."""
    if not workers:
        return None
    x1, y1, x2, y2 = bbox
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    best_id, best_dist = None, float("inf")
    for w in workers:
        wx1, wy1, wx2, wy2 = w["bbox"]
        wcx, wcy = (wx1 + wx2) / 2, (wy1 + wy2) / 2
        dist = (cx - wcx) ** 2 + (cy - wcy) ** 2
        if dist < best_dist:
            best_dist, best_id = dist, w["id"]
    return best_id


@router.websocket("/ws/stream/{camera_id}")
async def stream_endpoint(websocket: WebSocket, camera_id: str, mode: str = Query("producer")):
    """
    mode=producer (default): sends frames in, gets detections back, runs
    inference and logs violations. Used by the Dashboard's own webcam and by
    the RemoteCamera mobile page.

    mode=viewer: sends nothing, just receives whatever a producer for the
    same camera_id broadcasts (raw frame + detections) so it can be displayed
    without owning the camera itself — this is how the desktop dashboard
    watches a phone that's streaming as a remote camera. Also receives
    violation alerts like any other connection.
    """
    if mode == "viewer":
        await _viewer_loop(websocket, camera_id)
        return

    await alert_manager.connect(websocket)
    db = SessionLocal()
    last_violation_time = {}  # violation_type or zone key -> timestamp, per connection
    tracker = WorkerTracker()

    try:
        zones = db.query(Zone).filter(Zone.camera_id == camera_id).all()

        while True:
            frame_start = time.time()
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            frame = decode_frame(payload["frame"])
            if frame is None:
                continue
            h, w = frame.shape[:2]

            detections = detector.infer(frame)
            persons = [d for d in detections if d["class"] == "person"]
            violation_dets = [d for d in detections if d["is_violation"]]

            intrusions = check_zone_intrusions(persons, zones, w, h)

            # violation-person association happens before tracker update, using this frame's person boxes
            violation_person_indices = set()
            for det in violation_dets:
                vx1, vy1, vx2, vy2 = det["bbox"]
                vcx, vcy = (vx1 + vx2) / 2, (vy1 + vy2) / 2
                for i, p in enumerate(persons):
                    px1, py1, px2, py2 = p["bbox"]
                    if px1 <= vcx <= px2 and py1 <= vcy <= py2:
                        violation_person_indices.add(i)
                        break

            workers = tracker.update([p["bbox"] for p in persons], violation_person_indices)

            events = []
            now = time.time()

            for det in violation_dets:
                vtype = det["class"]
                last = last_violation_time.get(vtype, 0)
                if now - last < VIOLATION_COOLDOWN_SECONDS:
                    continue
                last_violation_time[vtype] = now

                worker_id = nearest_worker_id(det["bbox"], workers)
                # tag with whichever zone (if any) the violation occurred in,
                # for the zone-wise compliance breakdown — independent of
                # zone_intrusion, which is specifically about restricted-zone entry
                zone = find_zone_for_bbox(det["bbox"], zones, w, h)

                v = Violation(
                    camera_id=camera_id,
                    zone_id=zone.id if zone else None,
                    worker_track_id=worker_id,
                    violation_type=vtype,
                    severity=SEVERITY_MAP.get(vtype, "medium"),
                    confidence=det["confidence"],
                    bbox=json.dumps(normalize_bbox(det["bbox"], w, h)),
                )
                db.add(v)
                db.commit()
                db.refresh(v)
                snapshot_path = save_snapshot(frame, v.id)
                v.snapshot_path = snapshot_path
                db.commit()

                events.append(
                    {
                        "type": "violation",
                        "id": v.id,
                        "violation_type": vtype,
                        "worker_track_id": worker_id,
                        "zone_name": zone.name if zone else None,
                        "severity": v.severity,
                        "confidence": v.confidence,
                        "camera_id": camera_id,
                        "created_at": v.created_at.isoformat(),
                    }
                )

            for zone, det in intrusions:
                key = f"zone:{zone.id}"
                last = last_violation_time.get(key, 0)
                if now - last < VIOLATION_COOLDOWN_SECONDS:
                    continue
                last_violation_time[key] = now

                worker_id = nearest_worker_id(det["bbox"], workers)

                v = Violation(
                    camera_id=camera_id,
                    zone_id=zone.id,
                    worker_track_id=worker_id,
                    violation_type="zone_intrusion",
                    severity="critical",
                    confidence=det["confidence"],
                    bbox=json.dumps(normalize_bbox(det["bbox"], w, h)),
                )
                db.add(v)
                db.commit()
                db.refresh(v)
                snapshot_path = save_snapshot(frame, v.id)
                v.snapshot_path = snapshot_path
                db.commit()

                events.append(
                    {
                        "type": "violation",
                        "id": v.id,
                        "violation_type": "zone_intrusion",
                        "zone_name": zone.name,
                        "worker_track_id": worker_id,
                        "severity": "critical",
                        "confidence": det["confidence"],
                        "camera_id": camera_id,
                        "created_at": v.created_at.isoformat(),
                    }
                )

            inference_ms = round((time.time() - frame_start) * 1000, 1)

            # always send back current-frame detections + worker roster + engine timing
            await websocket.send_json(
                {
                    "type": "detections",
                    "detections": detections,
                    "workers": workers,
                    "inference_ms": inference_ms,
                }
            )

            # relay the same frame + detections to any viewers watching this camera
            # (e.g. desktop dashboard watching a phone streaming as a remote camera)
            if viewer_hub.viewer_count(camera_id) > 0:
                await viewer_hub.broadcast(
                    camera_id,
                    {
                        "type": "frame",
                        "camera_id": camera_id,
                        "image": payload["frame"],
                        "detections": detections,
                        "workers": workers,
                        "inference_ms": inference_ms,
                    },
                )

            for e in events:
                await alert_manager.broadcast(e)

    except WebSocketDisconnect:
        alert_manager.disconnect(websocket)
    finally:
        db.close()


async def _viewer_loop(websocket: WebSocket, camera_id: str):
    await alert_manager.connect(websocket)
    viewer_hub.register(camera_id, websocket)
    try:
        while True:
            # viewers don't send meaningful data — this just keeps the
            # connection open and detects disconnects. Client sends an
            # occasional ping which is ignored.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        alert_manager.disconnect(websocket)
        viewer_hub.unregister(camera_id, websocket)