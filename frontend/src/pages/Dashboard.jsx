import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera as CameraIcon, Smartphone } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import EngineStatusBar from '../components/EngineStatusBar.jsx'
import LiveFeed from '../components/LiveFeed.jsx'
import AlertsPanel from '../components/AlertsPanel.jsx'
import WorkerStatusPanel from '../components/WorkerStatusPanel.jsx'
import StatsCharts from '../components/StatsCharts.jsx'
import ZoneEditor from '../components/ZoneEditor.jsx'
import CameraManager from '../components/CameraManager.jsx'
import Footer from '../components/Footer.jsx'
import { WS_BASE, fetchStats, fetchZones, deleteZone, resolveViolation, acknowledgeViolation, deleteViolation } from '../api.js'
import { fireViolationNotification } from '../utils/notifications.js'

const DEFAULT_CAMERA = { id: 'cam-01', name: 'Camera 1', source_type: 'local' }
const FRAME_INTERVAL_MS = 700

export default function Dashboard() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const captureCanvasRef = useRef(document.createElement('canvas'))
  const frameTimestamps = useRef([])

  const [activeCamera, setActiveCamera] = useState(DEFAULT_CAMERA)
  const [showCameraManager, setShowCameraManager] = useState(false)
  const [connected, setConnected] = useState(false)
  const [detections, setDetections] = useState([])
  const [workers, setWorkers] = useState([])
  const [inferenceMs, setInferenceMs] = useState(null)
  const [fps, setFps] = useState(null)
  const [remoteFrame, setRemoteFrame] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [zones, setZones] = useState([])
  const [showZoneEditor, setShowZoneEditor] = useState(false)
  const [snapshotUrl, setSnapshotUrl] = useState(null)
  const [cameraError, setCameraError] = useState(null)

  const isRemote = activeCamera.source_type === 'remote'

  const loadStats = useCallback(() => {
    fetchStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const loadZones = useCallback(() => {
    fetchZones(activeCamera.id).then((r) => setZones(r.data)).catch(() => {})
  }, [activeCamera.id])

  useEffect(() => {
    loadStats()
    const statsInterval = setInterval(loadStats, 15000)
    return () => clearInterval(statsInterval)
  }, [loadStats])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  // reset per-camera live state whenever the active camera changes
  useEffect(() => {
    setDetections([])
    setWorkers([])
    setRemoteFrame(null)
    setInferenceMs(null)
    setFps(null)
    frameTimestamps.current = []
  }, [activeCamera.id, activeCamera.source_type])

  // local webcam init — only when viewing a local-source camera
  useEffect(() => {
    if (isRemote) {
      setCameraError(null)
      return
    }
    if (!window.isSecureContext) {
      setCameraError(
        'Camera access requires HTTPS (or localhost). This page is loaded over an insecure connection — the browser is blocking camera access.'
      )
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('This browser does not support camera access (getUserMedia unavailable).')
      return
    }

    let stream
    const constraints = {
      video: activeCamera.deviceId
        ? { deviceId: { exact: activeCamera.deviceId }, width: 1280, height: 720 }
        : { width: 1280, height: 720 },
    }
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setCameraError(null)
      })
      .catch((err) => {
        const messages = {
          NotAllowedError: 'Camera permission was denied. Allow camera access in your browser\'s site settings and reload.',
          NotFoundError: 'No camera was found on this device.',
          NotReadableError: 'The camera is already in use by another application or tab.',
          OverconstrainedError: 'That camera device is unavailable — try picking a different one in Cameras.',
        }
        setCameraError(messages[err.name] || `Could not access the camera (${err.name || err.message}).`)
        console.error('Camera access failed:', err)
      })

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [isRemote, activeCamera.deviceId])

  // websocket — producer mode for a local camera (sends frames, gets detections
  // back), viewer mode for a remote/mobile camera (receives frames + detections
  // that some other connection, e.g. a phone, is producing for this camera_id)
  useEffect(() => {
    const wsUrl = isRemote
      ? `${WS_BASE}/ws/stream/${activeCamera.id}?mode=viewer`
      : `${WS_BASE}/ws/stream/${activeCamera.id}`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.type === 'detections' || data.type === 'frame') {
        setDetections(data.detections)
        setWorkers(data.workers || [])
        setInferenceMs(data.inference_ms)
        if (data.type === 'frame') setRemoteFrame(data.image)

        const now = performance.now()
        frameTimestamps.current.push(now)
        frameTimestamps.current = frameTimestamps.current.filter((t) => now - t < 5000)
        if (frameTimestamps.current.length > 1) {
          const span = (frameTimestamps.current.at(-1) - frameTimestamps.current[0]) / 1000
          setFps(span > 0 ? Math.round((frameTimestamps.current.length - 1) / span * 10) / 10 : null)
        }
      } else if (data.type === 'violation') {
        setAlerts((prev) => [data, ...prev].slice(0, 50))
        fireViolationNotification(data)
        loadStats()
      }
    }

    let interval
    if (!isRemote) {
      interval = setInterval(() => {
        const video = videoRef.current
        if (!video || video.readyState !== 4 || ws.readyState !== WebSocket.OPEN) return
        const canvas = captureCanvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        ws.send(JSON.stringify({ frame: dataUrl }))

        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth
          canvasRef.current.height = video.videoHeight
        }
      }, FRAME_INTERVAL_MS)
    } else {
      // viewer connections send nothing meaningful — a periodic ping just
      // keeps the socket from looking idle/dead on some proxies
      interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 20000)
    }

    return () => {
      clearInterval(interval)
      ws.close()
    }
  }, [isRemote, activeCamera.id, loadStats])

  const handleAcknowledge = (id) => {
    acknowledgeViolation(id).then(() => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
    })
  }

  const handleResolve = (id) => {
    resolveViolation(id).then(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    })
  }

  const handleDelete = (id) => {
    if (!window.confirm('Permanently delete this violation and its snapshot? This cannot be undone.')) return
    deleteViolation(id).then(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    })
  }

  const openZoneEditor = () => {
    if (isRemote) {
      if (canvasRef.current?.width > 0) {
        setSnapshotUrl(canvasRef.current.toDataURL('image/jpeg', 0.8))
        setShowZoneEditor(true)
      }
      return
    }
    const canvas = captureCanvasRef.current
    if (canvas.width > 0) {
      setSnapshotUrl(canvas.toDataURL('image/jpeg', 0.8))
      setShowZoneEditor(true)
    }
  }

  const handleDeleteZone = (id) => {
    deleteZone(id).then(loadZones)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopBar connected={connected} cameraId={activeCamera.id} alertCount={alerts.length} />

      <main className="p-6 space-y-4 flex-1">
        <EngineStatusBar
          connected={connected}
          fps={fps}
          inferenceMs={inferenceMs}
          modelName={stats?.model_name}
          ppeCapable={stats?.ppe_capable}
        />

        <StatsCharts stats={stats} activeWorkers={workers.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] text-muted flex items-center gap-1.5">
                {isRemote ? <Smartphone size={12} className="text-info" /> : <CameraIcon size={12} />}
                {activeCamera.name}
              </p>
              <button
                onClick={() => setShowCameraManager(true)}
                className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-amber"
              >
                Manage Cameras
              </button>
            </div>

            <LiveFeed
              videoRef={videoRef}
              canvasRef={canvasRef}
              detections={detections}
              zones={zones}
              workers={workers}
              cameraError={cameraError}
              remoteFrame={remoteFrame}
            />

            {zones.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {zones.map((z) => (
                  <span
                    key={z.id}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider bg-panel2 border border-border rounded-sm px-2 py-1"
                  >
                    {z.name}
                    <button onClick={() => handleDeleteZone(z.id)} className="text-muted hover:text-critical">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] text-muted">
                {zones.length} zone{zones.length !== 1 ? 's' : ''} configured &middot; {detections.length} objects tracked
              </p>
              <button
                onClick={openZoneEditor}
                className="font-mono text-xs uppercase tracking-wider border border-amber text-amber px-3 py-1.5 rounded-sm hover:bg-amber/10 transition-colors"
              >
                + Define Danger Zone
              </button>
            </div>

            <WorkerStatusPanel workers={workers} />
          </div>

          <div className="h-[560px]">
            <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} onResolve={handleResolve} onDelete={handleDelete} />
          </div>
        </div>
      </main>

      <Footer />

      {showZoneEditor && (
        <ZoneEditor
          cameraId={activeCamera.id}
          snapshotDataUrl={snapshotUrl}
          onZoneCreated={loadZones}
          onClose={() => setShowZoneEditor(false)}
        />
      )}

      {showCameraManager && (
        <CameraManager
          activeCameraId={activeCamera.id}
          onSelectCamera={(cam) => setActiveCamera({ ...cam, name: cam.name || cam.id })}
          onClose={() => setShowCameraManager(false)}
        />
      )}
    </div>
  )
}