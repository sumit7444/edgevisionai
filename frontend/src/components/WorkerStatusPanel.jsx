import { Users, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function WorkerStatusPanel({ workers }) {
  return (
    <div className="panel-glass rounded-sm flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg tracking-wide flex items-center gap-2">
          <Users size={16} className="text-amber" />
          WORKER STATUS
        </h2>
        <span className="font-mono text-xs text-muted bg-panel2 px-2 py-0.5 rounded-sm border border-border">
          {workers.length} on site
        </span>
      </div>
      <div className="max-h-[220px] overflow-y-auto divide-y divide-border">
        {workers.length === 0 && (
          <p className="p-4 text-xs text-muted font-mono">No workers currently in frame.</p>
        )}
        {workers.map((w) => (
          <div key={w.id} className="px-4 py-2.5 flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-2">
              {w.compliant ? (
                <CheckCircle2 size={14} className="text-safe" />
              ) : (
                <AlertTriangle size={14} className="text-critical" />
              )}
              <span className="font-mono text-xs">{w.id}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[10px] uppercase tracking-wider ${w.compliant ? 'text-safe' : 'text-critical'}`}>
                {w.compliant ? 'Compliant' : 'Violation'}
              </span>
              <span className="font-mono text-[10px] text-muted tabular-nums">{w.duration_seconds}s</span>
            </div>
          </div>
        ))}
      </div>
      <p className="px-4 py-2 text-[10px] font-mono text-muted/60 border-t border-border">
        IDs are session-based (in-frame tracking only), not persistent identity.
      </p>
    </div>
  )
}
