import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Plus,
  Trash2,
  Hexagon,
  Square,
  AlertTriangle,
  HardHat,
  Camera,
  Layers,
} from 'lucide-react'
import { fetchZones, fetchCameras, deleteZone } from '../api'
import ZoneEditor from '../components/ZoneEditor.jsx'

export default function RestrictedZonesPage() {
  const [zones, setZones] = useState([])
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)

  const loadData = async () => {
    try {
      const [zonesRes, camsRes] = await Promise.all([
        fetchZones(selectedCameraId || undefined),
        fetchCameras(),
      ])
      setZones(zonesRes.data)
      setCameras(camsRes.data)
      if (!selectedCameraId && camsRes.data.length > 0) {
        setSelectedCameraId(camsRes.data[0].id)
      }
    } catch (e) {
      console.error('Error loading zones:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCameraId])

  const handleDelete = async (id) => {
    if (confirm('Delete this safety zone polygon?')) {
      await deleteZone(id)
      loadData()
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-ink uppercase">RESTRICTED SAFETY ZONES</h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            GEOFENCED DANGER POLYGONS, INTRUSION VIRTUAL FENCES, & PPE MANDATES
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Camera selector */}
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="bg-panel border border-border rounded px-3 py-2 font-mono text-xs text-ink focus:border-amber focus:outline-none"
          >
            <option value="">All Cameras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors"
          >
            <Plus size={16} />
            <span>Draw Zone</span>
          </button>
        </div>
      </div>

      {/* Zones List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {zones.length === 0 ? (
          <div className="col-span-full bg-panel border border-border rounded-lg p-12 text-center font-mono text-xs text-muted">
            No safety zones defined for the selected camera. Click "Draw Zone" to define geofenced perimeters.
          </div>
        ) : (
          zones.map((zone) => {
            const isRestricted = zone.zone_type === 'restricted'
            return (
              <div
                key={zone.id}
                className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between hover:border-amber/40 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded flex items-center justify-center ${
                          isRestricted
                            ? 'bg-critical/20 text-critical border border-critical/40'
                            : 'bg-amber/20 text-amber border border-amber/40'
                        }`}
                      >
                        {zone.shape_type === 'rectangle' ? <Square size={16} /> : <Hexagon size={16} />}
                      </div>
                      <div>
                        <h3 className="font-mono text-sm font-bold text-ink">{zone.name}</h3>
                        <p className="font-mono text-[10px] text-muted uppercase">Camera: {zone.camera_id}</p>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${
                        isRestricted
                          ? 'border-critical/40 bg-critical/10 text-critical'
                          : 'border-amber/40 bg-amber/10 text-amber'
                      }`}
                    >
                      {zone.zone_type?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 font-mono text-xs bg-panel2 p-3 rounded border border-border/70 text-muted">
                    <div className="flex justify-between">
                      <span>Geometry:</span>
                      <span className="text-ink uppercase">{zone.shape_type} ({zone.points?.length || 0} vertices)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Enforcement:</span>
                      <span className="text-ink">
                        {isRestricted ? 'Zero-tolerance intrusion' : 'Mandatory PPE Verification'}
                      </span>
                    </div>
                    {zone.rules && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-[10px] uppercase text-muted block mb-1">Zone Rules:</span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(zone.rules).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 rounded bg-canvas border border-border text-[9px] text-amber">
                              {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between font-mono text-xs">
                  <span className="text-muted text-[10px]">
                    Created {new Date(zone.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(zone.id)}
                    className="p-1 text-muted hover:text-critical transition-colors"
                    title="Delete Zone"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Embedded Zone Editor */}
      {showEditor && (
        <ZoneEditor
          cameraId={selectedCameraId || 'cam-01'}
          onZoneCreated={() => {
            setShowEditor(false)
            loadData()
          }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
