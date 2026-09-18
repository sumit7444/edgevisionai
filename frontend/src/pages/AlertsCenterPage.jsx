import { useState, useMemo } from 'react'
import {
  BellRing,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Clock,
  Camera,
  Trash2,
} from 'lucide-react'
import { useAlerts } from '../context/AlertContext.jsx'

export default function AlertsCenterPage({ onSelectViolation }) {
  const { alerts, unreadCount, soundEnabled, toggleSound, acknowledgeAlert, resolveAlert } = useAlerts()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all | unacknowledged | unresolved

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSearch =
        a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.camera_id?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchSeverity = severityFilter === 'all' || a.severity === severityFilter

      let matchStatus = true
      if (statusFilter === 'unacknowledged') matchStatus = !a.acknowledged
      if (statusFilter === 'unresolved') matchStatus = !a.resolved

      return matchSearch && matchSeverity && matchStatus
    })
  }, [alerts, searchTerm, severityFilter, statusFilter])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-body">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl tracking-wider text-ink uppercase">ALERTS CENTER</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-critical/20 text-critical border border-critical/40 animate-pulse">
                {unreadCount} UNACKNOWLEDGED
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            REAL-TIME SAFETY ESCALATIONS & IMMEDIATE HAZARD NOTIFICATIONS
          </p>
        </div>

        <button
          onClick={toggleSound}
          className={`flex items-center gap-2 px-3.5 py-2 rounded font-mono text-xs border transition-colors ${
            soundEnabled
              ? 'bg-amber/10 border-amber/40 text-amber'
              : 'bg-panel border-border text-muted hover:text-ink'
          }`}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundEnabled ? 'ALERT CHIMES ACTIVE' : 'CHIMES MUTED'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-panel border border-border rounded-lg p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search alerts, cameras, messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-canvas border border-border rounded pl-9 pr-3 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-amber"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Severity selector */}
          <div className="flex items-center gap-1 bg-panel2 border border-border rounded p-1 font-mono text-xs">
            {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  severityFilter === sev ? 'bg-amber text-canvas font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-1 bg-panel2 border border-border rounded p-1 font-mono text-xs">
            {['all', 'unacknowledged', 'unresolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded capitalize transition-colors ${
                  statusFilter === st ? 'bg-amber text-canvas font-bold' : 'text-muted hover:text-ink'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-panel border border-border rounded-lg p-12 text-center font-mono text-xs text-muted">
            No safety alerts matching the selected filter criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical'
            return (
              <div
                key={alert.id}
                className={`bg-panel border rounded-lg p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !alert.acknowledged
                    ? isCritical
                      ? 'border-critical/60 bg-critical/5 shadow-md shadow-critical/5'
                      : 'border-amber/50 bg-amber/5 shadow-md shadow-amber/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-critical/20 text-critical border border-critical/40'
                        : alert.severity === 'high'
                        ? 'bg-amber/20 text-amber border border-amber/40'
                        : 'bg-info/20 text-info border border-info/40'
                    }`}
                  >
                    {isCritical ? <ShieldAlert size={22} /> : <AlertTriangle size={20} />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-mono text-sm font-bold text-ink uppercase tracking-wide">
                        {alert.title}
                      </h3>
                      <span
                        className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          isCritical
                            ? 'bg-critical text-canvas'
                            : alert.severity === 'high'
                            ? 'bg-amber text-canvas'
                            : 'bg-info text-canvas'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      {alert.acknowledged && (
                        <span className="font-mono text-[10px] text-muted flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-safe" /> Acknowledged
                        </span>
                      )}
                      {alert.resolved && (
                        <span className="font-mono text-[10px] text-safe font-bold">
                          • Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted mt-1 leading-relaxed max-w-2xl">{alert.message}</p>

                    <div className="flex items-center gap-4 font-mono text-[10px] text-muted mt-2">
                      <span className="flex items-center gap-1">
                        <Camera size={12} /> {alert.camera_id || 'cam-01'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(alert.created_at).toLocaleString()}
                      </span>
                      {alert.violation_id && (
                        <button
                          onClick={() => onSelectViolation && onSelectViolation(alert.violation_id)}
                          className="text-amber hover:underline"
                        >
                          View Incident Snapshot →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3.5 py-1.5 rounded bg-panel2 border border-amber/50 hover:bg-amber/10 text-amber font-mono text-xs uppercase font-bold transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="px-3.5 py-1.5 rounded bg-panel2 border border-safe/50 hover:bg-safe/10 text-safe font-mono text-xs uppercase font-bold transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
