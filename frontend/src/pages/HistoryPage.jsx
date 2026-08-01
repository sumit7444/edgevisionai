import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, Search, FileDown, Sheet, Eye, Trash2 } from 'lucide-react'
import { fetchViolations, resolveViolation, acknowledgeViolation, deleteViolation, clearViolations, API_BASE } from '../api'
import InsightsCard from '../components/InsightsCard.jsx'
import HeatmapChart from '../components/HeatmapChart.jsx'
import IncidentTimeline from '../components/IncidentTimeline.jsx'
import Footer from '../components/Footer.jsx'

const SEVERITY_DOT = {
  critical: 'bg-critical',
  high: 'bg-amber',
  medium: 'bg-muted',
  low: 'bg-border',
}

export default function HistoryPage() {
  const [violations, setViolations] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchViolations({
      violation_type: typeFilter || undefined,
      severity: severityFilter || undefined,
      search: search || undefined,
      limit: 200,
    })
      .then((r) => setViolations(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search typing
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, severityFilter, search])

  const handleResolve = (id) => {
    resolveViolation(id).then(() => {
      setViolations((prev) => prev.map((v) => (v.id === id ? { ...v, resolved: true } : v)))
    })
  }

  const handleAcknowledge = (id) => {
    acknowledgeViolation(id).then(() => {
      setViolations((prev) => prev.map((v) => (v.id === id ? { ...v, acknowledged: true } : v)))
    })
  }

  const handleDelete = (id) => {
    if (!window.confirm('Permanently delete this violation and its snapshot? This cannot be undone.')) return
    deleteViolation(id).then(() => {
      setViolations((prev) => prev.filter((v) => v.id !== id))
    })
  }

  const handleClearAll = () => {
    const filtered = typeFilter || severityFilter
    const msg = filtered
      ? 'Permanently delete all violations matching the current filters (and their snapshots)? This cannot be undone.'
      : 'Permanently delete the ENTIRE violation log and all snapshots? This cannot be undone.'
    if (!window.confirm(msg)) return
    clearViolations({
      violation_type: typeFilter || undefined,
      severity: severityFilter || undefined,
    }).then(() => load())
  }

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('EdgeVision AI — Violation Log', 14, 16)
    doc.setFontSize(9)
    doc.text(new Date().toLocaleString(), 14, 22)
    doc.autoTable({
      startY: 28,
      head: [['Type', 'Severity', 'Worker', 'Confidence', 'Status', 'Time']],
      body: violations.map((v) => [
        v.violation_type.replace('_', ' '),
        v.severity,
        v.worker_track_id || '—',
        `${(v.confidence * 100).toFixed(0)}%`,
        v.resolved ? 'Resolved' : v.acknowledged ? 'Acknowledged' : 'Open',
        new Date(v.created_at).toLocaleString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [242, 169, 0], textColor: [11, 13, 16] },
    })
    doc.save(`edgevision-violations-${Date.now()}.pdf`)
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = violations.map((v) => ({
      Type: v.violation_type.replace('_', ' '),
      Severity: v.severity,
      Worker: v.worker_track_id || '',
      'Confidence %': (v.confidence * 100).toFixed(0),
      Status: v.resolved ? 'Resolved' : v.acknowledged ? 'Acknowledged' : 'Open',
      Time: new Date(v.created_at).toLocaleString(),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Violations')
    XLSX.writeFile(wb, `edgevision-violations-${Date.now()}.xlsx`)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-6 space-y-6 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-wide">VIOLATION LOG</h2>
            <p className="text-[11px] text-muted font-mono tracking-widest uppercase mt-0.5">
              Full incident history &amp; analytics
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider border border-border px-3 py-1.5 rounded-sm text-muted hover:text-ink hover:border-safe/40 transition-colors"
            >
              <Sheet size={13} /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider border border-border px-3 py-1.5 rounded-sm text-muted hover:text-ink hover:border-amber/40 transition-colors"
            >
              <FileDown size={13} /> PDF
            </button>
            <button
              onClick={handleClearAll}
              disabled={violations.length === 0}
              className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider border border-critical/40 px-3 py-1.5 rounded-sm text-critical hover:bg-critical/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <Trash2 size={13} /> Clear{typeFilter || severityFilter ? ' Filtered' : ' All'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InsightsCard />
          <HeatmapChart />
          <IncidentTimeline />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by type or worker ID…"
              className="w-full bg-panel2 border border-border rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono outline-none focus:border-amber"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-panel2 border border-border rounded-sm px-3 py-1.5 text-xs font-mono outline-none focus:border-amber"
          >
            <option value="">All types</option>
            <option value="no_hardhat">No hardhat</option>
            <option value="no_vest">No vest</option>
            <option value="zone_intrusion">Zone intrusion</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-panel2 border border-border rounded-sm px-3 py-1.5 text-xs font-mono outline-none focus:border-amber"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="panel-glass rounded-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Type</th>
                <th className="px-4 py-3 font-normal">Worker</th>
                <th className="px-4 py-3 font-normal">Severity</th>
                <th className="px-4 py-3 font-normal">Confidence</th>
                <th className="px-4 py-3 font-normal">Time</th>
                <th className="px-4 py-3 font-normal text-right">Snapshot</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading && violations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted font-mono text-xs">
                    No violations match these filters.
                  </td>
                </tr>
              )}
              {violations.map((v) => (
                <tr key={v.id} className="hover:bg-panel2/60 transition-colors">
                  <td className="px-4 py-3">
                    {v.resolved ? (
                      <CheckCircle2 size={15} className="text-safe" />
                    ) : v.acknowledged ? (
                      <Eye size={15} className="text-amber" />
                    ) : (
                      <Circle size={15} className="text-muted" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                    {v.violation_type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{v.worker_track_id || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[v.severity]}`} />
                      {v.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{(v.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {new Date(v.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {v.snapshot_path && (
                      <a
                        href={`${API_BASE}/api/violations/${v.id}/snapshot`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-muted hover:text-amber"
                      >
                        View <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!v.acknowledged && !v.resolved && (
                        <button
                          onClick={() => handleAcknowledge(v.id)}
                          className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink border border-border px-2 py-1 rounded-sm hover:border-amber/40"
                        >
                          Ack
                        </button>
                      )}
                      {!v.resolved && (
                        <button
                          onClick={() => handleResolve(v.id)}
                          className="text-[10px] font-mono uppercase tracking-wider text-muted hover:text-ink border border-border px-2 py-1 rounded-sm hover:border-safe/40"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(v.id)}
                        title="Permanently delete"
                        className="text-muted hover:text-critical border border-border hover:border-critical/40 px-1.5 py-1 rounded-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  )
}