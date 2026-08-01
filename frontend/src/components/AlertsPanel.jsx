import { HardHat, MapPinOff, CheckCircle2, ShieldOff, AlertTriangle, Eye, Trash2 } from 'lucide-react'
import { API_BASE } from '../api'

const SEVERITY_STYLE = {
  critical: 'border-l-critical bg-critical/[0.06]',
  high: 'border-l-amber bg-amber/[0.06]',
  medium: 'border-l-muted bg-panel2',
  low: 'border-l-border bg-panel2',
}

const SEVERITY_BADGE = {
  critical: 'text-critical bg-critical/10 border-critical/30',
  high: 'text-amber bg-amber/10 border-amber/30',
  medium: 'text-muted bg-panel2 border-border',
  low: 'text-muted bg-panel2 border-border',
}

const TYPE_ICON = {
  no_hardhat: HardHat,
  no_vest: ShieldOff,
  zone_intrusion: MapPinOff,
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function AlertsPanel({ alerts, onAcknowledge, onResolve, onDelete }) {
  return (
    <div className="panel-glass rounded-sm flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl tracking-wide">LIVE ALERTS</h2>
        <span className="font-mono text-xs text-muted bg-panel2 px-2 py-0.5 rounded-sm border border-border">
          {alerts.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {alerts.length === 0 && (
          <div className="p-8 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={28} className="text-safe/60" strokeWidth={1.5} />
            <p className="text-sm text-muted font-mono">Site is compliant</p>
            <p className="text-[11px] text-muted/60">No violations detected yet</p>
          </div>
        )}
        {alerts.map((a) => {
          const Icon = TYPE_ICON[a.violation_type] || AlertTriangle
          return (
            <div
              key={a.id}
              className={`p-3 border-l-2 animate-fade-in-up ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium} ${
                a.acknowledged ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <a
                  href={`${API_BASE}/api/violations/${a.id}/snapshot`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open full snapshot"
                  className="shrink-0"
                >
                  <img
                    src={`${API_BASE}/api/violations/${a.id}/snapshot`}
                    alt=""
                    className="w-16 h-12 object-cover rounded-sm border border-border bg-panel2 hover:border-amber/50 transition-colors"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider truncate">
                      <Icon size={13} className="text-ink/80 shrink-0" strokeWidth={1.75} />
                      {a.violation_type.replace('_', ' ')}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider border rounded-sm px-1.5 py-0.5 shrink-0 ${
                        SEVERITY_BADGE[a.severity] || SEVERITY_BADGE.medium
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted">
                    {a.worker_track_id && <span>{a.worker_track_id}</span>}
                    {a.zone_name && <span>Zone: {a.zone_name}</span>}
                    <span className="ml-auto">{timeAgo(a.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-muted">
                      CONF {(a.confidence * 100).toFixed(0)}%
                    </span>
                    <div className="flex items-center gap-2">
                      {!a.acknowledged && (
                        <button
                          onClick={() => onAcknowledge(a.id)}
                          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink border border-border px-2 py-0.5 rounded-sm hover:border-amber/40"
                        >
                          <Eye size={10} /> Ack
                        </button>
                      )}
                      <button
                        onClick={() => onResolve(a.id)}
                        className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink border border-border px-2 py-0.5 rounded-sm hover:border-safe/40"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => onDelete(a.id)}
                        title="Permanently delete"
                        className="text-muted hover:text-critical border border-border hover:border-critical/40 px-1.5 py-0.5 rounded-sm"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}