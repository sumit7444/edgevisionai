"""
Tracks "viewer" WebSocket connections per camera_id — used so a desktop
dashboard can watch a live feed that's being produced by a different
connection (e.g. a phone streaming as a remote camera). A producer connection
broadcasts each frame + detections here; every registered viewer for that
camera_id receives it. Separate from websocket_manager's alert_manager, which
broadcasts violation alerts to every connection regardless of camera.
"""
from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket


class ViewerHub:
    def __init__(self):
        self.viewers: Dict[str, Set[WebSocket]] = defaultdict(set)

    def register(self, camera_id: str, websocket: WebSocket):
        self.viewers[camera_id].add(websocket)

    def unregister(self, camera_id: str, websocket: WebSocket):
        self.viewers.get(camera_id, set()).discard(websocket)

    def viewer_count(self, camera_id: str) -> int:
        return len(self.viewers.get(camera_id, set()))

    async def broadcast(self, camera_id: str, message: dict):
        dead = []
        for ws in self.viewers.get(camera_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.unregister(camera_id, ws)


viewer_hub = ViewerHub()