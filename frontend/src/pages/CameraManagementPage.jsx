import { useState, useEffect } from 'react'
import {
  Camera,
  Plus,
  Smartphone,
  Video,
  Trash2,
  Edit2,
  QrCode,
  Check,
  Copy,
  ExternalLink,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react'
import QRCode from 'qrcode'
import {
  fetchCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  setCameraStatus,
} from '../api'

export default function CameraManagementPage({ onSwitchToCamera }) {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Form states
  const [camName, setCamName] = useState('')
  const [camLocation, setCamLocation] = useState('')
  const [camSourceType, setCamSourceType] = useState('local')
  const [localDevices, setLocalDevices] = useState([])

  const loadCameras = async () => {
    try {
      const res = await fetchCameras()
      setCameras(res.data)
    } catch (e) {
      console.error('Error fetching cameras:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCameras()
    // Enumerate hardware video devices
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput')
          setLocalDevices(videoInputs)
        })
        .catch(() => {})
    }
  }, [])

  const handleCreateCamera = async (e) => {
    e.preventDefault()
    if (!camName.trim()) return

    const newId =
      camSourceType === 'remote'
        ? `mob-${Date.now().toString(36).slice(-4)}`
        : `cam-${Date.now().toString(36).slice(-4)}`

    await createCamera({
      id: newId,
      name: camName,
      location: camLocation || 'Industrial Facility',
      source_type: camSourceType,
    })

    setCamName('')
    setCamLocation('')
    setShowAddModal(false)
    loadCameras()
  }

  const handleDelete = async (id) => {
    if (confirm(`Are you sure you want to remove camera ${id}?`)) {
      await deleteCamera(id)
      loadCameras()
    }
  }

  const handleToggleStatus = async (cam) => {
    const nextStatus = cam.status === 'online' ? 'offline' : 'online'
    await setCameraStatus(cam.id, nextStatus)
    loadCameras()
  }

  const handleOpenQr = async (cam) => {
    const origin = window.location.origin
    const remoteUrl = `${origin}/?remote=${cam.id}`
    const dataUrl = await QRCode.toDataURL(remoteUrl, { width: 280, margin: 2 })
    setQrDataUrl(dataUrl)
    setShowQrModal({ ...cam, url: remoteUrl })
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-ink uppercase">CAMERA MANAGEMENT</h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            NETWORK RTSP, USB WEBCAMS, AND WIRELESS MOBILE SENSOR STREAMS
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors"
        >
          <Plus size={16} />
          <span>Add Stream Source</span>
        </button>
      </div>

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cameras.map((cam) => {
          const isOnline = cam.status === 'online'
          return (
            <div
              key={cam.id}
              className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between hover:border-amber/40 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded bg-panel2 border border-border flex items-center justify-center text-amber">
                      {cam.source_type === 'remote' ? <Smartphone size={18} /> : <Video size={18} />}
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-ink truncate max-w-[170px]">{cam.name}</h3>
                      <p className="font-mono text-[10px] text-muted uppercase tracking-wider">{cam.id}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(cam)}
                    className={`flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border uppercase transition-colors ${
                      isOnline
                        ? 'border-safe/40 bg-safe/10 text-safe'
                        : 'border-critical/40 bg-critical/10 text-critical'
                    }`}
                  >
                    {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
                    <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 font-mono text-xs text-muted bg-panel2 p-3 rounded border border-border/70">
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-ink truncate max-w-[140px]">{cam.location || 'Facility Floor'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-ink uppercase">{cam.source_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Framerate:</span>
                    <span className="text-ink">{cam.fps || 15} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolution:</span>
                    <span className="text-ink">{cam.resolution || '1280x720'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                {cam.source_type === 'remote' ? (
                  <button
                    onClick={() => handleOpenQr(cam)}
                    className="flex items-center gap-1.5 font-mono text-xs text-amber hover:underline"
                  >
                    <QrCode size={14} />
                    <span>Mobile QR Stream</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSwitchToCamera && onSwitchToCamera(cam.id)}
                    className="flex items-center gap-1.5 font-mono text-xs text-info hover:underline"
                  >
                    <Activity size={14} />
                    <span>View Stream</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(cam.id)}
                  title="Remove Camera"
                  className="p-1.5 text-muted hover:text-critical hover:bg-critical/10 rounded transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-lg max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <h2 className="font-display text-2xl tracking-wider text-ink uppercase mb-4">REGISTER NEW CAMERA</h2>
            <form onSubmit={handleCreateCamera} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-muted uppercase mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fabrication Bay North"
                  value={camName}
                  onChange={(e) => setCamName(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted uppercase mb-1">Installation Location</label>
                <input
                  type="text"
                  placeholder="e.g. Building 4, Zone B"
                  value={camLocation}
                  onChange={(e) => setCamLocation(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted uppercase mb-1">Source Interface</label>
                <select
                  value={camSourceType}
                  onChange={(e) => setCamSourceType(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                >
                  <option value="local">Local USB / System Webcam</option>
                  <option value="remote">Mobile Phone Remote Camera (QR Code)</option>
                </select>
              </div>

              {camSourceType === 'local' && localDevices.length > 0 && (
                <div className="p-2.5 bg-panel2 rounded border border-border text-[11px] text-muted">
                  Detected {localDevices.length} OS video devices ready for capture.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded bg-panel2 hover:bg-border text-muted transition-colors uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-amber hover:bg-amber/90 text-canvas font-bold uppercase transition-colors"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Streaming Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-lg max-w-sm w-full p-6 shadow-2xl text-center animate-fade-in-up">
            <h2 className="font-display text-2xl tracking-wider text-ink uppercase mb-2">MOBILE STREAM PAIRING</h2>
            <p className="text-xs text-muted font-mono mb-4">
              Scan with your smartphone camera to stream directly to {showQrModal.name} ({showQrModal.id}).
            </p>

            {qrDataUrl && (
              <div className="bg-white p-3 rounded-lg inline-block shadow-inner mb-4">
                <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 mx-auto" />
              </div>
            )}

            <div className="flex items-center gap-2 bg-canvas border border-border p-2 rounded mb-4">
              <input
                type="text"
                readOnly
                value={showQrModal.url}
                className="bg-transparent font-mono text-[11px] text-muted w-full focus:outline-none"
              />
              <button
                onClick={() => handleCopy(showQrModal.url)}
                className="p-1 text-amber hover:text-amber/80 shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-2 rounded bg-panel2 hover:bg-border text-ink font-mono text-xs uppercase transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
