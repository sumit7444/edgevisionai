# EdgeVision AI — Real-Time Industrial Worker Safety Monitoring System

Real-time PPE compliance and danger-zone intrusion monitoring for industrial sites.
Streams webcam frames to a YOLOv8 backend over WebSocket, overlays live detections,
logs violations, and shows compliance analytics on a dashboard.

## Stack
- **Frontend**: React + Vite, Tailwind CSS, Recharts
- **Backend**: FastAPI, Ultralytics YOLOv8, OpenCV, WebSockets
- **Database**: PostgreSQL (Neon) via SQLAlchemy — SQLite fallback for local dev

## ⚠️ Important: PPE detection model
This ships with the stock pretrained `yolov8n.pt`, which only knows COCO classes
(`person`, `car`, etc.) — it will detect and track people, but it **cannot**
actually tell if someone is wearing a hardhat or vest, because COCO has no such
classes. The violation-logging pipeline (zone intrusion, alerts, DB, dashboard)
is fully functional; PPE-specific detection needs a fine-tuned model to be real.

**A full dataset-download-and-training pipeline is included** — see
`backend/training/README.md`. It walks through pulling a public PPE dataset
from Roboflow and fine-tuning YOLOv8n on it (~30-45 min on a free Colab GPU),
then wiring the resulting `best.pt` into this app via `MODEL_PATH`. Nothing
else in the codebase needs to change once you do.

Zone intrusion detection works fully out of the box since it only needs person
detection, which the stock model handles well.

### Custom PPE classes (gloves, goggles, mask, smoke)
`backend/app/detection/detector.py`'s `PPE_CLASS_MAP` already recognizes
gloves, goggles, mask, and a smoke/fire hazard class, on top of hardhat/vest —
wiring a class name is separate from a model actually detecting it well,
though. Realistically: hardhat/vest/gloves/goggles/mask can plausibly come
from one broad PPE dataset if you find one that labels all five; smoke/fire
is a genuinely different visual domain and is normally its own model — this
app currently runs one model per frame, so combining a PPE model with a
separate smoke model would mean calling `detector.infer()` twice and merging
results, which isn't wired up yet. See `backend/training/README.md`.

## Multi-camera & remote mobile camera
Open "Manage Cameras" on the Live Monitor page to:
- **Add a local camera** — picks from any camera your OS exposes to the
  browser (`navigator.mediaDevices.enumerateDevices()`), including USB
  webcams and Bluetooth-paired cameras that register as a system camera
  device. There's no separate "Bluetooth mode" needed for those — the
  browser doesn't distinguish transport, so if the OS sees it, this picker
  sees it. True Bluetooth *video streaming* (e.g. reading frames straight off
  a BLE peripheral) isn't something browsers support — Web Bluetooth is for
  low-power GATT devices, not camera streams — so that path only works via a
  Bluetooth camera that already shows up as a normal webcam to the OS.
- **Add a mobile camera** — generates a shareable link + QR code
  (`?remote=<camera_id>`). Opening it on a phone loads the minimal
  `RemoteCamera` page, which asks for camera permission and streams to the
  same `/ws/stream/{camera_id}` endpoint as any local camera, just in
  "producer" mode from the phone instead of the desktop. The dashboard then
  connects to that camera_id in "viewer" mode (`?mode=viewer`) and renders
  whatever frames + detections the phone's connection produces — this needs
  the backend reachable over HTTPS from the phone (camera access requires a
  secure context), so this feature is really only useful once deployed, not
  against `localhost`.

## Local setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173 — the browser will ask for camera permission.

## Deployment (your usual stack)

### Backend → Render
1. New Web Service, root directory `backend`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Env vars: `DATABASE_URL` (Neon connection string), `MODEL_PATH`, `CORS_ORIGINS` (your Vercel URL)
5. Note: `ultralytics` + `opencv-python-headless` are heavy — use Render's paid tier if the free tier build times out or the instance can't hold the model in memory.

### Frontend → Vercel
1. Root directory `frontend`
2. Env var: `VITE_API_URL=https://your-backend.onrender.com` (set at build time — remember Vite bakes env vars into the build)
3. `CORS_ORIGINS` on the backend must exactly match the Vercel domain, no trailing slash.

### Database → Neon
Create a Postgres project, copy the connection string into `DATABASE_URL`.
Tables auto-create on backend startup via `Base.metadata.create_all`.

## UI structure
Sidebar-driven shell (`App.jsx`) with two views:
- **Live Monitor** (`pages/Dashboard.jsx`) — webcam feed with a viewfinder-reticle
  frame, live bbox/zone/worker-ID overlay, compliance stats, camera switching,
  and a live alerts feed
- **Violation Log** (`pages/HistoryPage.jsx`) — filterable violation history
  table, zone-wise compliance chart, heatmap, incident timeline, safety
  insights, and PDF/Excel export

`pages/RemoteCamera.jsx` is a separate minimal page (not part of the sidebar
shell) that a phone opens via the `?remote=` link generated in Manage Cameras.

Visual language: near-black canvas with a faint blueprint grid, safety-amber
accents, hazard-stripe dividers, and glass-panel cards — deliberately playing
on industrial/technical-drawing motifs rather than a generic dark dashboard.

## Architecture notes
- Frames are sent from the browser over WebSocket as base64 JPEG every ~700ms (tunable via `FRAME_INTERVAL_MS`) — not a raw video stream, to keep bandwidth and inference load manageable on a free-tier backend.
- Violations have an 8-second cooldown per type/zone so a sustained violation doesn't flood the DB with duplicate rows.
- Danger zones are polygon or click-drag rectangles drawn on a live snapshot; zone_intrusion is checked using the person bounding box's bottom-center point (feet position), while PPE violations are zone-tagged by bbox center — both feed the zone-wise compliance chart.
- Worker IDs come from a simple in-process IoU tracker, scoped to one WebSocket connection — session-based, not real re-identification.
- Snapshots of each violation are saved to `backend/snapshots/` and served at `/snapshots/<file>`. Deleting a violation removes its snapshot file too.
- Multi-camera: each `camera_id` gets its own zones, tracker, and violation-cooldown state, scoped per WebSocket connection. A "viewer" connection (used for remote cameras) receives whatever a "producer" connection for the same camera_id broadcasts — see `app/viewer_hub.py`.

## API summary
- `GET /api/violations` — list/filter/search violation history
- `PATCH /api/violations/{id}/resolve` / `/acknowledge` — update status
- `DELETE /api/violations/{id}` — permanently delete one (+ its snapshot)
- `DELETE /api/violations` — bulk clear, respects the same filters as GET
- `GET /api/stats/summary` — compliance rate, trend, uptime, model info
- `GET /api/stats/by-zone` — violation counts grouped by zone
- `GET /api/stats/heatmap` — coarse grid of where in-frame violations cluster
- `GET /api/insights` — rule-based safety recommendations
- `POST /api/zones`, `GET /api/zones?camera_id=`, `DELETE /api/zones/{id}`
- `POST /api/cameras`, `GET /api/cameras`, `DELETE /api/cameras/{id}`
- `WS /ws/stream/{camera_id}` — producer mode (default): frame in, detections out. `WS /ws/stream/{camera_id}?mode=viewer` — receive-only, for watching a remote camera