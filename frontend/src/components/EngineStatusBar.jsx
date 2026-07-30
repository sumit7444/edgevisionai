import { Cpu, Gauge, Video, VideoOff } from 'lucide-react'

export default function EngineStatusBar({ connected, fps, inferenceMs, modelName, ppeCapable }) {
  return (
    <div className="panel-glass rounded-sm px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-mono text-[11px]">
      <div className="flex items-center gap-1.5 text-muted">
        <Cpu size={13} className={connected ? 'text-safe' : 'text-critical'} />
        AI ENGINE
        <span className={connected ? 'text-safe' : 'text-critical'}>{connected ? 'RUNNING' : 'STOPPED'}</span>
      </div>
      <div className="w-px h-3 bg-border hidden sm:block" />
      <div className="flex items-center gap-1.5 text-muted">
        <Gauge size={13} className="text-amber" />
        FPS <span className="text-ink tabular-nums">{fps || '—'}</span>
      </div>
      <div className="w-px h-3 bg-border hidden sm:block" />
      <div className="text-muted">
        INFERENCE <span className="text-ink tabular-nums">{inferenceMs ? `${inferenceMs}ms` : '—'}</span>
      </div>
      <div className="w-px h-3 bg-border hidden sm:block" />
      <div className="text-muted truncate max-w-[220px]">
        MODEL <span className="text-ink">{modelName || 'yolov8n.pt'}</span>
        {!ppeCapable && <span className="text-amber ml-1">(person-only)</span>}
      </div>
      <div className="w-px h-3 bg-border hidden sm:block" />
      <div className="flex items-center gap-1.5 text-muted">
        {connected ? <Video size={13} className="text-safe" /> : <VideoOff size={13} className="text-critical" />}
        CAMERA <span className={connected ? 'text-safe' : 'text-critical'}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
    </div>
  )
}
