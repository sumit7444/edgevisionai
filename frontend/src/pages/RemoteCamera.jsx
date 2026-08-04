import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, ShieldAlert } from 'lucide-react'
import { WS_BASE } from '../api'

const FRAME_INTERVAL_MS = 700

export default function RemoteCamera({ cameraId }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const wsRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [lastEvent, setLastEvent] = useState(null)

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      const stream = videoRef.current?.srcObject
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const start = async () => {
    setError(null)
    if (!window.isSecureContext) {
      setError('This page needs HTTPS to access the camera. Open the deployed (https://) link, not a plain http:// address.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const ws = new WebSocket(`${WS_BASE}/ws/stream/${cameraId}`)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        setStreaming(true)
      }
      ws.onclose = () => {
        setConnected(false)
        setStreaming(false)
      }
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data)
        if (data.type === 'violation') setLastEvent(data)
      }

      const interval = setInterval(() => {
        const video = videoRef.current
        if (!video || video.readyState !== 4 || ws.readyState !== WebSocket.OPEN) return
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        ws.send(JSON.stringify({ frame: canvas.toDataURL('image/jpeg', 0.6) }))
      }, FRAME_INTERVAL_MS)

      ws.addEventListener('close', () => clearInterval(interval))
    } catch (err) {
      const messages = {
        NotAllowedError: 'Camera permission was denied. Allow camera access in your browser settings and reload.',
        NotFoundError: 'No camera was found on this device.',
        NotReadableError: 'The camera is already in use by another app.',
      }
      setError(messages[err.name] || `Could not access the camera (${err.name || err.message}).`)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 rounded-sm bg-amber flex items-center justify-center mb-3">
        <ShieldAlert size={18} className="text-canvas" strokeWidth={2.5} />
      </div>
      <h1 className="font-display text-2xl tracking-wide text-ink">REMOTE CAMERA</h1>
      <p className="font-mono text-[11px] text-muted tracking-widest uppercase mt-1 mb-6">
        Streaming as {cameraId}
      </p>

      <div className="relative w-full max-w-sm aspect-video bg-panel border border-border rounded-sm overflow-hidden mb-6">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
        {!streaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <VideoOff size={28} className="text-muted" />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-critical font-mono mb-4 max-w-sm">{error}</p>}

      {!streaming ? (
        <button
          onClick={start}
          className="flex items-center gap-2 bg-amber text-canvas font-mono text-sm uppercase tracking-wider px-6 py-3 rounded-sm"
        >
          <Video size={16} /> Start Streaming
        </button>
      ) : (
        <div className="flex items-center gap-1.5 font-mono text-xs text-safe">
          <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
          Live — {connected ? 'connected' : 'reconnecting…'}
        </div>
      )}

      {lastEvent && (
        <div className="mt-6 border-l-2 border-critical bg-critical/10 rounded-sm px-3 py-2 text-left max-w-sm">
          <p className="font-mono text-[10px] uppercase tracking-wider text-critical">
            {lastEvent.violation_type.replace('_', ' ')}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Just detected on this camera</p>
        </div>
      )}

      <p className="text-[10px] font-mono text-muted/50 mt-8 max-w-xs">
        Keep this tab open and the screen on while streaming. Closing it or locking the phone stops the feed.
      </p>
    </div>
  )
}