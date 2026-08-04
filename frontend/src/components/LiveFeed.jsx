import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Camera, VideoOff, Smartphone } from 'lucide-react'

const CLASS_COLORS = {
  person: '#4A90D9',
  no_hardhat: '#E8432F',
  no_vest: '#E8432F',
  no_gloves: '#8B5CF6',
  no_goggles: '#8B5CF6',
  no_mask: '#EC4899',
  smoke: '#F97316',
  hardhat: '#2FB380',
  vest: '#2FB380',
}

export default function LiveFeed({
  videoRef,
  canvasRef,
  detections,
  zones,
  workers = [],
  cameraError = null,
  remoteFrame = null, // base64 JPEG dataURL from a remote/mobile camera, when not using the local webcam
}) {
  const containerRef = useRef(null)
  const remoteImgRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const drawOverlay = (w, h) => {
      // zones (polygon or rectangle — both stored as a point list)
      zones.forEach((zone) => {
        ctx.beginPath()
        zone.points.forEach(([x, y], i) => {
          const px = x * w
          const py = y * h
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.closePath()
        ctx.strokeStyle = zone.zone_type === 'restricted' ? '#E8432F' : '#F2A900'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.stroke()
        ctx.fillStyle = zone.zone_type === 'restricted' ? 'rgba(232,67,47,0.08)' : 'rgba(242,169,0,0.08)'
        ctx.fill()
        ctx.setLineDash([])
        const [lx, ly] = zone.points[0]
        ctx.fillStyle = '#E8E9EA'
        ctx.font = '11px "IBM Plex Mono", monospace'
        ctx.fillText(zone.name.toUpperCase(), lx * w + 4, ly * h - 4)
      })

      // detections — PPE labels with confidence
      detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.bbox
        const color = CLASS_COLORS[det.class] || '#7B8288'
        ctx.strokeStyle = color
        ctx.lineWidth = det.is_violation ? 3 : 1.5
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
        const label = `${det.class.replace('_', ' ').toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`
        ctx.font = '11px "IBM Plex Mono", monospace'
        const labelW = ctx.measureText(label).width + 8
        ctx.fillStyle = color
        ctx.fillRect(x1, y1 - 16, labelW, 16)
        ctx.fillStyle = '#0B0D10'
        ctx.fillText(label, x1 + 4, y1 - 4)
      })

      // worker ID tags, bottom-anchored so they don't collide with PPE labels
      workers.forEach((w) => {
        const [x1, y1, x2, y2] = w.bbox
        const tagColor = w.compliant ? '#2FB380' : '#E8432F'
        const label = w.id
        ctx.font = '10px "IBM Plex Mono", monospace'
        const labelW = ctx.measureText(label).width + 8
        ctx.fillStyle = 'rgba(11,13,16,0.75)'
        ctx.fillRect(x1, y2, labelW, 15)
        ctx.strokeStyle = tagColor
        ctx.lineWidth = 1
        ctx.strokeRect(x1, y2, labelW, 15)
        ctx.fillStyle = tagColor
        ctx.fillText(label, x1 + 4, y2 + 11)
      })
    }

    if (remoteFrame) {
      // remote/mobile camera: no local <video>, draw the received JPEG as the
      // background then overlay on the same canvas
      if (!remoteImgRef.current) remoteImgRef.current = new Image()
      const img = remoteImgRef.current
      img.onload = () => {
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        drawOverlay(canvas.width, canvas.height)
      }
      img.src = remoteFrame
    } else {
      // local webcam: <video> renders the feed itself, canvas is a
      // transparent overlay sized to match it
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawOverlay(w, h)
    }
  }, [detections, zones, workers, remoteFrame])

  const hasActiveViolation = detections.some((d) => d.is_violation)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const takeScreenshot = () => {
    if (remoteFrame) {
      // canvas already has the image + overlay composited for remote cameras
      const link = document.createElement('a')
      link.download = `edgevision-snapshot-${Date.now()}.jpg`
      link.href = canvasRef.current.toDataURL('image/jpeg', 0.92)
      link.click()
      setFlash(true)
      setTimeout(() => setFlash(false), 200)
      return
    }
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    const overlay = canvasRef.current
    if (!video) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (overlay) ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height)
    const link = document.createElement('a')
    link.download = `edgevision-snapshot-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
    setFlash(true)
    setTimeout(() => setFlash(false), 200)
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-panel border rounded-sm overflow-hidden scanline-panel reticle transition-colors duration-300 ${
        hasActiveViolation ? 'border-critical animate-pulse-border' : 'border-border'
      }`}
    >
      {remoteFrame ? (
        <canvas ref={canvasRef} className="w-full aspect-video object-cover bg-black" />
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover bg-black" />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
        </>
      )}
      <div className="reticle-tr" />
      <div className="reticle-bl" />
      {flash && <div className="absolute inset-0 bg-white/80 z-20" />}

      {cameraError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center px-8 z-20">
          <VideoOff size={28} className="text-critical mb-3" strokeWidth={1.5} />
          <p className="font-mono text-xs text-critical uppercase tracking-widest mb-1.5">Camera Unavailable</p>
          <p className="text-xs text-muted max-w-sm">{cameraError}</p>
        </div>
      )}

      <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[10px] bg-black/60 px-2 py-1 tracking-widest z-10">
        {remoteFrame ? (
          <>
            <Smartphone size={11} className="text-info" />
            <span className="text-info">MOBILE</span>
          </>
        ) : (
          <span className="text-amber">● REC</span>
        )}
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <span className="font-mono text-[10px] text-ink/70 bg-black/60 px-2 py-1 tracking-widest">
          {detections.length} TRACKED
        </span>
        <button
          onClick={takeScreenshot}
          title="Save screenshot"
          className="bg-black/60 hover:bg-black/80 text-ink/80 hover:text-amber p-1.5 rounded-sm transition-colors"
        >
          <Camera size={13} />
        </button>
        <button
          onClick={toggleFullscreen}
          title="Toggle fullscreen"
          className="bg-black/60 hover:bg-black/80 text-ink/80 hover:text-amber p-1.5 rounded-sm transition-colors"
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
      {hasActiveViolation && (
        <div className="absolute bottom-3 left-3 font-mono text-[10px] text-critical bg-black/70 px-2 py-1 tracking-widest z-10 animate-pulse">
          ⚠ VIOLATION DETECTED
        </div>
      )}
    </div>
  )
}