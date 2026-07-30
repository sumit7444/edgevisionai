import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { fetchViolations, API_BASE } from '../api'

const SEVERITY_DOT = {
  critical: 'bg-critical',
  high: 'bg-amber',
  medium: 'bg-muted',
  low: 'bg-border',
}

export default function IncidentTimeline() {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetchViolations({ limit: 12 }).then((r) => setItems(r.data)).catch(() => {})
  }, [])

  return (
    <div className="panel-glass rounded-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={15} className="text-amber" />
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">Incident Timeline</p>
      </div>
      {items.length === 0 && <p className="text-xs font-mono text-muted">No incidents recorded yet.</p>}
      <div className="space-y-4">
        {items.map((v, i) => (
          <div key={v.id} className="flex gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex flex-col items-center pt-1">
              <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[v.severity]}`} />
              {i < items.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
            </div>
            {v.snapshot_path && (
              <img
                src={`${API_BASE}/api/violations/${v.id}/snapshot`}
                alt=""
                className="w-16 h-12 object-cover rounded-sm border border-border shrink-0"
              />
            )}
            <div className="min-w-0 pb-2">
              <p className="font-mono text-xs uppercase tracking-wide truncate">
                {v.violation_type.replace('_', ' ')}
                {v.worker_track_id && <span className="text-muted"> · {v.worker_track_id}</span>}
              </p>
              <p className="text-[10px] font-mono text-muted mt-0.5">
                {new Date(v.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
