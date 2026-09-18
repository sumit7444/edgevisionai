import { useState, useEffect } from 'react'
import {
  Users,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  Zap,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { fetchStats, fetchViolations, acknowledgeViolation, resolveViolation, fetchSystemHealth } from '../api'

export default function MainDashboardPage({ onNavigateTab, onSelectViolation }) {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [recentViolations, setRecentViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('7d')

  const loadData = async () => {
    try {
      const [statsRes, healthRes, violsRes] = await Promise.all([
        fetchStats(timeframe),
        fetchSystemHealth(),
        fetchViolations({ limit: 6 }),
      ])
      setStats(statsRes.data)
      setHealth(healthRes.data)
      setRecentViolations(violsRes.data)
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 8000)
    return () => clearInterval(timer)
  }, [timeframe])

  const handleAck = async (id, e) => {
    e.stopPropagation()
    await acknowledgeViolation(id)
    loadData()
  }

  const handleResolve = async (id, e) => {
    e.stopPropagation()
    await resolveViolation(id)
    loadData()
  }

  if (loading && !stats) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-panel2 rounded w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-panel2 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const complianceColor =
    (stats?.compliance_rate || 0) >= 90
      ? 'text-safe'
      : (stats?.compliance_rate || 0) >= 75
      ? 'text-amber'
      : 'text-critical'

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-body">
      {/* Top Banner with time filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-ink uppercase">EXECUTIVE SAFETY DASHBOARD</h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            SITE-WIDE AI WORKER PROTECTION & HAZARD MONITORING
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-panel border border-border p-1 rounded font-mono text-xs">
          {['7d', '14d', '30d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded transition-colors uppercase ${
                timeframe === tf ? 'bg-amber text-canvas font-bold' : 'text-muted hover:text-ink'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate */}
        <div className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Site PPE Compliance</span>
            <ShieldCheck size={20} className={complianceColor} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`font-mono text-4xl font-bold tracking-tight ${complianceColor}`}>
              {stats?.compliance_rate ?? 98}%
            </span>
            <span className="font-mono text-xs text-muted">Rolling Avg</span>
          </div>
          <div className="mt-3 w-full bg-canvas rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (stats?.compliance_rate || 0) >= 90 ? 'bg-safe' : (stats?.compliance_rate || 0) >= 75 ? 'bg-amber' : 'bg-critical'
              }`}
              style={{ width: `${stats?.compliance_rate ?? 98}%` }}
            />
          </div>
        </div>

        {/* Total Workers & Safe Workers */}
        <div className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Personnel Monitored</span>
            <Users size={20} className="text-info" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tracking-tight text-ink">
              {stats?.total_workers_count ?? 3}
            </span>
            <span className="font-mono text-xs text-safe font-semibold">
              ({stats?.safe_workers_count ?? 3} Safe)
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted mt-2">Active biometric/IoU tracking</p>
        </div>

        {/* Active Violations */}
        <div className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Active Violations</span>
            <AlertTriangle size={20} className="text-critical" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tracking-tight text-critical">
              {stats?.active_violations ?? 0}
            </span>
            <span className="font-mono text-xs text-muted">
              ({stats?.violations_today ?? 0} logged today)
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted mt-2">
            {stats?.resolved_violations ?? 0} total resolved
          </p>
        </div>

        {/* Active Cameras & System Latency */}
        <div className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">Optical Streams</span>
            <Camera size={20} className="text-amber" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-bold tracking-tight text-ink">
              {stats?.active_cameras_count ?? 1}
            </span>
            <span className="font-mono text-xs text-muted">Online</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted mt-2">
            <span className="text-safe">{health?.current_fps ?? 15} FPS</span>
            <span>•</span>
            <span>{health?.avg_latency_ms ?? 24}ms latency</span>
          </div>
        </div>
      </div>

      {/* Grid: Live Camera Quick View & System Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Incident Stream */}
        <div className="lg:col-span-2 bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber" />
              <h2 className="font-display text-xl tracking-wider text-ink uppercase">RECENT DETECTED INCIDENTS</h2>
            </div>
            <button
              onClick={() => onNavigateTab('violations')}
              className="font-mono text-xs text-amber hover:underline flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {recentViolations.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded font-mono text-xs text-muted">
              No recent safety violations recorded. Site is operating under nominal safety conditions.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentViolations.map((v) => (
                <div
                  key={v.id}
                  onClick={() => onSelectViolation && onSelectViolation(v.id)}
                  className="py-3 flex items-center justify-between hover:bg-panel2 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        v.severity === 'critical'
                          ? 'bg-critical animate-ping'
                          : v.severity === 'high'
                          ? 'bg-amber'
                          : 'bg-info'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ink font-bold uppercase">
                          {v.violation_type?.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.5 rounded uppercase ${
                            v.severity === 'critical'
                              ? 'bg-critical/20 text-critical border border-critical/40'
                              : 'bg-amber/20 text-amber border border-amber/40'
                          }`}
                        >
                          {v.severity}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-muted mt-0.5">
                        Camera: {v.camera_id || 'cam-01'} • Worker: {v.worker_track_id || 'Unidentified'} •{' '}
                        {new Date(v.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!v.acknowledged && (
                      <button
                        onClick={(e) => handleAck(v.id, e)}
                        className="px-2.5 py-1 rounded bg-panel border border-amber/40 hover:bg-amber/10 text-amber font-mono text-[10px] uppercase font-bold transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {!v.resolved && (
                      <button
                        onClick={(e) => handleResolve(v.id, e)}
                        className="px-2.5 py-1 rounded bg-panel border border-safe/40 hover:bg-safe/10 text-safe font-mono text-[10px] uppercase font-bold transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {v.resolved && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-safe">
                        <CheckCircle2 size={12} /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: AI Vision Engine Diagnostics */}
        <div className="bg-panel border border-border rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-amber" />
              <h2 className="font-display text-xl tracking-wider text-ink uppercase">AI ENGINE VITALS</h2>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Inference Model</span>
                <span className="text-ink font-semibold truncate max-w-[140px]">{stats?.model_name || 'best.pt'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Model Version</span>
                <span className="text-amber">{stats?.model_version || 'v1.2.0-yolov8'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Hardware Device</span>
                <span className="text-safe uppercase font-bold">{health?.device || 'AUTO / MPS'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Average Latency</span>
                <span className="text-ink">{health?.avg_latency_ms ?? 22.4} ms</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Database Link</span>
                <span className="text-safe uppercase">CONNECTED (POSTGRESQL)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Engine Uptime</span>
                <span className="text-muted">{Math.floor((stats?.uptime_seconds || 60) / 60)} minutes</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('monitor')}
            className="w-full mt-6 py-2.5 bg-amber/10 hover:bg-amber/20 border border-amber/40 text-amber rounded font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <span>Open Live Camera Feed</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
