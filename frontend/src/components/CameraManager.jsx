import { useEffect, useRef, useState } from 'react'
import { Camera as CameraIcon, Smartphone, Trash2, Check, Copy } from 'lucide-react'
import { fetchCameras, createCamera, deleteCamera } from '../api'

const DEVICE_MAP_KEY = 'edgevision-camera-devices'

function randomSlug(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}`
}

function getDeviceMap() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_MAP_KEY) || '{}')
  } catch {
    return {}
  }
}

function rememberDevice(cameraId, deviceId) {
  if (!deviceId) return
  const map = getDeviceMap()
  map[cameraId] = deviceId
  localStorage.setItem(DEVICE_MAP_KEY, JSON.stringify(map))
}

export default function CameraManager({ activeCameraId, onSelectCamera, onClose }) {
  const [cameras, setCameras] = useState([])
  const [devices, setDevices] = useState([])
  const [mode, setMode] = useState(null) // null | 'local' | 'remote'
  const [name, setName] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [remoteLink, setRemoteLink] = useState(null)
  const qrRef = useRef(null)

  const loadCameras = () => fetchCameras().then((r) => setCameras(r.data)).catch(() => {})

  useEffect(() => {
    loadCameras()
    navigator.mediaDevices?.enumerateDevices?.().then((all) => {
      setDevices(all.filter((d) => d.kind === 'videoinput'))
    })
  }, [])

  useEffect(() => {
    if (remoteLink && qrRef.current) {
      import('qrcode').then((QRCode) => {
        QRCode.toCanvas(qrRef.current, remoteLink, { width: 180, margin: 1, color: { dark: '#0B0D10', light: '#F2A900' } })
      })
    }
  }, [remoteLink])

  const addLocal = async () => {
    if (!name) return
    const id = randomSlug('cam')
    const cam = await createCamera({ id, name, source_type: 'local' })
    rememberDevice(id, deviceId)
    onSelectCamera({ ...cam.data, deviceId: deviceId || undefined })
    setName('')
    setDeviceId('')
    setMode(null)
    loadCameras()
  }

  const addRemote = async () => {
    if (!name) return
    const id = randomSlug('mobile')
    await createCamera({ id, name, source_type: 'remote' })
    setRemoteLink(`${window.location.origin}${window.location.pathname}?remote=${id}`)
    loadCameras()
  }

  const handleSelect = (cam) => {
    // local cameras remember which physical device they were last bound to
    // (deviceId is browser-local, so it's never stored server-side)
    const deviceId = cam.source_type === 'local' ? getDeviceMap()[cam.id] : undefined
    onSelectCamera({ ...cam, deviceId })
    onClose()
  }

  const handleDelete = (id) => {
    deleteCamera(id).then(loadCameras)
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(remoteLink)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-panel border border-border rounded-sm max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-panel">
          <h3 className="font-display text-xl tracking-wide">CAMERAS</h3>
          <button onClick={onClose} className="text-muted hover:text-ink font-mono text-sm">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-2">
          {cameras.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between bg-panel2 border border-border rounded-sm px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {c.source_type === 'remote' ? (
                  <Smartphone size={14} className="text-info shrink-0" />
                ) : (
                  <CameraIcon size={14} className="text-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-mono text-xs truncate">{c.name}</p>
                  <p className="font-mono text-[9px] text-muted uppercase tracking-wider">
                    {c.id} · {c.source_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeCameraId === c.id ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-safe">
                    <Check size={12} /> Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleSelect(c)}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-amber border border-border px-2 py-1 rounded-sm"
                  >
                    View
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-critical">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {cameras.length === 0 && (
            <p className="text-xs font-mono text-muted text-center py-4">No cameras added yet.</p>
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode(mode === 'local' ? null : 'local')}
              className={`flex-1 flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-3 py-2 rounded-sm border transition-colors ${
                mode === 'local' ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted'
              }`}
            >
              <CameraIcon size={13} /> Add Local Camera
            </button>
            <button
              onClick={() => setMode(mode === 'remote' ? null : 'remote')}
              className={`flex-1 flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-3 py-2 rounded-sm border transition-colors ${
                mode === 'remote' ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted'
              }`}
            >
              <Smartphone size={13} /> Add Mobile Camera
            </button>
          </div>

          {mode === 'local' && (
            <div className="space-y-2 animate-fade-in-up">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Camera name (e.g. Entrance Cam)"
                className="w-full bg-panel2 border border-border rounded-sm px-3 py-2 text-sm font-mono outline-none focus:border-amber"
              />
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-panel2 border border-border rounded-sm px-3 py-2 text-sm font-mono outline-none"
              >
                <option value="">Default camera device</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-mono text-muted/60">
                Any USB or Bluetooth-paired webcam recognized by your OS shows up in this list automatically —
                the browser doesn't distinguish how it connects.
              </p>
              <button
                onClick={addLocal}
                disabled={!name}
                className="w-full bg-amber text-canvas font-mono text-sm uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
              >
                Add &amp; View
              </button>
            </div>
          )}

          {mode === 'remote' && (
            <div className="space-y-2 animate-fade-in-up">
              {!remoteLink ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Camera name (e.g. John's Phone)"
                    className="w-full bg-panel2 border border-border rounded-sm px-3 py-2 text-sm font-mono outline-none focus:border-amber"
                  />
                  <button
                    onClick={addRemote}
                    disabled={!name}
                    className="w-full bg-amber text-canvas font-mono text-sm uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
                  >
                    Generate Link
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-2">
                  <canvas ref={qrRef} className="rounded-sm" />
                  <div className="flex items-center gap-2 w-full">
                    <input
                      readOnly
                      value={remoteLink}
                      className="flex-1 bg-panel2 border border-border rounded-sm px-2 py-1.5 text-[10px] font-mono text-muted truncate"
                    />
                    <button onClick={copyLink} className="text-muted hover:text-amber shrink-0">
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-muted/60 text-center">
                    Scan with the phone's camera app, or open the link in its browser. It'll ask for camera
                    permission and start streaming to this dashboard. Requires HTTPS in production.
                  </p>
                  <button
                    onClick={() => {
                      setRemoteLink(null)
                      setName('')
                      setMode(null)
                    }}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}