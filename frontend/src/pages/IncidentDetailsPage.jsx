import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  Camera,
  User,
  Clock,
  CheckCircle2,
  FileCheck,
  MapPin,
  Flame,
  Send,
} from 'lucide-react'
import { fetchViolation, acknowledgeViolation, resolveViolation, API_BASE } from '../api'

export default function IncidentDetailsPage({ violationId, onBack }) {
  const [violation, setViolation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadIncident = async () => {
    if (!violationId) return
    setLoading(true)
    try {
      const res = await fetchViolation(violationId)
      setViolation(res.data)
    } catch (err) {
      setError('Could not load incident details. The incident may have been purged.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncident()
  }, [violationId])

  const handleAcknowledge = async () => {
    setActionLoading(true)
    await acknowledgeViolation(violation.id)
    await loadIncident()
    setActionLoading(false)
  }

  const handleResolve = async () => {
    setActionLoading(true)
    await resolveViolation(violation.id)
    await loadIncident()
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="p-8 font-mono text-xs text-muted animate-pulse">
        Fetching incident forensics and photographic evidence...
      </div>
    )
  }

  if (error || !violation) {
    return (
      <div className="p-8 space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-mono text-xs text-amber hover:underline uppercase"
        >
          <ArrowLeft size={15} /> Back to Records
        </button>
        <div className="p-6 bg-panel border border-border rounded text-critical font-mono text-xs">
          {error || 'No incident selected for investigation.'}
        </div>
      </div>
    )
  }

  const isCritical = violation.severity === 'critical'
  const snapshotUrl = violation.snapshot_path
    ? `${API_BASE}/api/violations/${violation.id}/snapshot`
    : null

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-body">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-panel border border-border hover:border-amber text-ink font-mono text-xs uppercase transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Violation Log</span>
        </button>

        <span className="font-mono text-xs text-muted uppercase">Incident #{violation.id.slice(0, 8)}</span>
      </div>

      {/* Main Incident Card */}
      <div className="bg-panel border border-border rounded-lg overflow-hidden shadow-2xl">
        {/* Banner */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isCritical
              ? 'bg-critical/10 border-critical/40 text-critical'
              : 'bg-amber/10 border-amber/40 text-amber'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={24} />
            <div>
              <h1 className="font-display text-2xl tracking-wider uppercase font-bold text-ink">
                {violation.violation_type?.replace(/_/g, ' ')}
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-wider">
                Severity: {violation.severity} • Confidence: {Math.round(violation.confidence * 100)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {violation.resolved ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-safe/20 text-safe font-mono text-xs uppercase font-bold border border-safe/40">
                <CheckCircle2 size={15} /> Resolved
              </span>
            ) : violation.acknowledged ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber/20 text-amber font-mono text-xs uppercase font-bold border border-amber/40">
                <FileCheck size={15} /> Under Investigation
              </span>
            ) : (
              <span className="px-3 py-1 rounded bg-critical/20 text-critical font-mono text-xs uppercase font-bold border border-critical/40 animate-pulse">
                Action Required
              </span>
            )}
          </div>
        </div>

        {/* Content Body: Image on left, metadata on right */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Photographic Evidence Viewfinder */}
          <div>
            <h3 className="font-mono text-xs uppercase text-muted tracking-wider mb-2">Camera Evidence Snapshot</h3>
            <div className="relative bg-canvas border border-border rounded overflow-hidden aspect-video flex items-center justify-center">
              {snapshotUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={snapshotUrl}
                    alt="Violation Evidence"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = ''
                    }}
                  />
                  {/* Bounding box reticle overlay if bbox coordinates exist */}
                  {violation.bbox && violation.bbox.length === 4 && (
                    <div
                      className="absolute border-2 border-critical bg-critical/10 pointer-events-none"
                      style={{
                        left: `${violation.bbox[0] * 100}%`,
                        top: `${violation.bbox[1] * 100}%`,
                        width: `${(violation.bbox[2] - violation.bbox[0]) * 100}%`,
                        height: `${(violation.bbox[3] - violation.bbox[1]) * 100}%`,
                      }}
                    >
                      <span className="absolute -top-5 left-0 bg-critical text-canvas font-mono text-[9px] px-1 font-bold uppercase">
                        {violation.violation_type?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center font-mono text-xs text-muted">
                  <Camera size={32} className="mx-auto mb-2 opacity-40" />
                  No high-resolution frame persisted for this event
                </div>
              )}
            </div>
          </div>

          {/* Incident Metadata & Investigation Timeline */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <h3 className="font-mono text-xs uppercase text-muted tracking-wider mb-2">Telemetry & Audit Record</h3>
              <div className="bg-panel2 rounded p-4 border border-border space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted flex items-center gap-1.5"><Camera size={13} /> Optical Stream</span>
                  <span className="text-ink font-bold">{violation.camera_id || 'cam-01'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted flex items-center gap-1.5"><User size={13} /> Personnel / Track ID</span>
                  <span className="text-amber font-bold">{violation.worker_track_id || 'Unassigned Track'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted flex items-center gap-1.5"><MapPin size={13} /> Geofence Zone</span>
                  <span className="text-ink">{violation.zone_id || 'General Industrial Floor'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted flex items-center gap-1.5"><Clock size={13} /> Incident Timestamp</span>
                  <span className="text-ink">{new Date(violation.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted">Resolution Auditor</span>
                  <span className="text-safe">{violation.resolved_by || (violation.resolved ? 'Safety Officer' : 'Pending')}</span>
                </div>
              </div>
            </div>

            {/* Operator Actions */}
            <div className="pt-4 border-t border-border flex flex-wrap gap-3">
              {!violation.acknowledged && (
                <button
                  disabled={actionLoading}
                  onClick={handleAcknowledge}
                  className="px-5 py-2.5 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors"
                >
                  Acknowledge Incident
                </button>
              )}
              {!violation.resolved && (
                <button
                  disabled={actionLoading}
                  onClick={handleResolve}
                  className="px-5 py-2.5 bg-safe hover:bg-safe/90 text-canvas font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
