import { useRef, useState } from 'react'
import { Hexagon, Square } from 'lucide-react'
import { createZone } from '../api'

export default function ZoneEditor({ cameraId, snapshotDataUrl, onZoneCreated, onClose }) {
  const canvasRef = useRef(null)
  const [shapeMode, setShapeMode] = useState('polygon') // polygon | rectangle
  const [points, setPoints] = useState([])
  const [dragStart, setDragStart] = useState(null)
  const [dragCurrent, setDragCurrent] = useState(null)
  const [name, setName] = useState('')
  const [zoneType, setZoneType] = useState('restricted')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const getRelativePoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }

  const handleClick = (e) => {
    if (shapeMode !== 'polygon') return
    setPoints([...points, getRelativePoint(e)])
  }

  const handleMouseDown = (e) => {
    if (shapeMode !== 'rectangle') return
    const p = getRelativePoint(e)
    setDragStart(p)
    setDragCurrent(p)
  }

  const handleMouseMove = (e) => {
    if (shapeMode !== 'rectangle' || !dragStart) return
    setDragCurrent(getRelativePoint(e))
  }

  const handleMouseUp = () => {
    if (shapeMode !== 'rectangle' || !dragStart || !dragCurrent) return
    const [x1, y1] = dragStart
    const [x2, y2] = dragCurrent
    setPoints([
      [Math.min(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.min(y1, y2)],
      [Math.max(x1, x2), Math.max(y1, y2)],
      [Math.min(x1, x2), Math.max(y1, y2)],
    ])
    setDragStart(null)
    setDragCurrent(null)
  }

  const switchMode = (mode) => {
    setShapeMode(mode)
    setPoints([])
    setDragStart(null)
    setDragCurrent(null)
  }

  const handleSave = async () => {
    if (points.length < 3 || !name || saving) return
    setSaving(true)
    setError(null)
    try {
      await createZone({ camera_id: cameraId, name, zone_type: zoneType, shape_type: shapeMode, points })
      onZoneCreated()
      onClose()
    } catch (err) {
      setError('Could not save — check the backend is running and reachable.')
      setSaving(false)
    }
  }

  const previewRect =
    shapeMode === 'rectangle' && dragStart && dragCurrent
      ? {
          x: Math.min(dragStart[0], dragCurrent[0]) * 100,
          y: Math.min(dragStart[1], dragCurrent[1]) * 100,
          w: Math.abs(dragCurrent[0] - dragStart[0]) * 100,
          h: Math.abs(dragCurrent[1] - dragStart[1]) * 100,
        }
      : null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
      <div className="bg-panel border border-border rounded-sm max-w-2xl w-full">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-xl tracking-wide">DEFINE DANGER ZONE</h3>
          <button onClick={onClose} className="text-muted hover:text-ink font-mono text-sm">
            ✕
          </button>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => switchMode('polygon')}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors ${
                shapeMode === 'polygon' ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted'
              }`}
            >
              <Hexagon size={12} /> Polygon
            </button>
            <button
              onClick={() => switchMode('rectangle')}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors ${
                shapeMode === 'rectangle' ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted'
              }`}
            >
              <Square size={12} /> Rectangle
            </button>
          </div>

          <div className="relative">
            <img src={snapshotDataUrl} className="w-full rounded-sm" alt="camera snapshot" />
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair"
            />
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {points.length > 0 && (
                <polygon
                  points={points.map(([x, y]) => `${x * 100}%,${y * 100}%`).join(' ')}
                  fill="rgba(242,169,0,0.15)"
                  stroke="#F2A900"
                  strokeWidth="2"
                />
              )}
              {shapeMode === 'polygon' &&
                points.map(([x, y], i) => (
                  <circle key={i} cx={`${x * 100}%`} cy={`${y * 100}%`} r="4" fill="#F2A900" />
                ))}
              {previewRect && (
                <rect
                  x={`${previewRect.x}%`}
                  y={`${previewRect.y}%`}
                  width={`${previewRect.w}%`}
                  height={`${previewRect.h}%`}
                  fill="rgba(242,169,0,0.15)"
                  stroke="#F2A900"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
              )}
            </svg>
          </div>
          <p className="text-[11px] font-mono text-muted mt-2">
            {shapeMode === 'polygon'
              ? `Click on the image to place polygon points (${points.length} placed, min 3 required).`
              : 'Click and drag on the image to draw a rectangular zone.'}
          </p>
          <div className="flex gap-3 mt-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zone name (e.g. Crane Radius)"
              className="flex-1 bg-panel2 border border-border rounded-sm px-3 py-2 text-sm font-mono outline-none focus:border-amber"
            />
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value)}
              className="bg-panel2 border border-border rounded-sm px-3 py-2 text-sm font-mono outline-none"
            >
              <option value="restricted">Restricted</option>
              <option value="ppe_required">PPE Required</option>
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={points.length < 3 || !name || saving}
              className="bg-amber text-canvas font-mono text-sm uppercase tracking-wider px-4 py-2 rounded-sm disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save Zone'}
            </button>
            <button
              onClick={() => setPoints([])}
              disabled={saving}
              className="border border-border font-mono text-sm uppercase tracking-wider px-4 py-2 rounded-sm text-muted disabled:opacity-40"
            >
              Clear
            </button>
          </div>
          {error && <p className="text-[11px] font-mono text-critical mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
