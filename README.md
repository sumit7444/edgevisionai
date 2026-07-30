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
  frame, live bbox/zone overlay, compliance stats, and a live alerts feed
- **Violation Log** (`pages/HistoryPage.jsx`) — full filterable violation
  history table with snapshot links and resolve actions

Visual language: near-black canvas with a faint blueprint grid, safety-amber
accents, hazard-stripe dividers, and glass-panel cards — deliberately playing
on industrial/technical-drawing motifs rather than a generic dark dashboard.

## Architecture notes
- Frames are sent from the browser over WebSocket as base64 JPEG every ~700ms (tunable via `FRAME_INTERVAL_MS` in `Dashboard.jsx`) — not a raw video stream, to keep bandwidth and inference load manageable on a free-tier backend.
- Violations have an 8-second cooldown per type/zone so a sustained violation doesn't flood the DB with duplicate rows.
- Danger zones are polygons drawn by clicking on a live snapshot; intrusion is checked using the person bounding box's bottom-center point (feet position) against the zone polygon.
- Snapshots of each violation are saved to `backend/snapshots/` and served at `/snapshots/<file>`.

## API summary
- `GET /api/violations` — list/filter violation history
- `PATCH /api/violations/{id}/resolve` — mark resolved
- `GET /api/stats/summary` — compliance rate, trend, breakdowns
- `POST /api/zones`, `GET /api/zones?camera_id=`, `DELETE /api/zones/{id}`
- `WS /ws/stream/{camera_id}` — frame in, detections + alerts out
