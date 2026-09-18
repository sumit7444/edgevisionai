import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Download,
  ShieldCheck,
  Calendar,
  Layers,
  Flame,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { fetchStats, fetchZoneStats, fetchHeatmap, fetchInsights, fetchViolations } from '../api'
import HeatmapChart from '../components/HeatmapChart.jsx'
import InsightsCard from '../components/InsightsCard.jsx'
import ZoneComplianceChart from '../components/ZoneComplianceChart.jsx'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const PIE_COLORS = ['#E8432F', '#F2A900', '#4A90D9', '#2FB380', '#9B51E0', '#FF8A00']

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null)
  const [zoneStats, setZoneStats] = useState([])
  const [heatmap, setHeatmap] = useState([])
  const [insights, setInsights] = useState([])
  const [timeframe, setTimeframe] = useState('14d')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [sRes, zRes, hRes, iRes] = await Promise.all([
        fetchStats(timeframe),
        fetchZoneStats(),
        fetchHeatmap(),
        fetchInsights(),
      ])
      setStats(sRes.data)
      setZoneStats(zRes.data)
      setHeatmap(hRes.data)
      setInsights(iRes.data)
    } catch (e) {
      console.error('Error fetching analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeframe])

  const exportExcel = async () => {
    const res = await fetchViolations({ limit: 500 })
    const rows = res.data.map((v) => ({
      ID: v.id,
      Date: new Date(v.created_at).toLocaleString(),
      Type: v.violation_type,
      Severity: v.severity,
      Camera: v.camera_id,
      Worker: v.worker_track_id || 'N/A',
      Confidence: `${Math.round(v.confidence * 100)}%`,
      Resolved: v.resolved ? 'Yes' : 'No',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Violations')
    XLSX.writeFile(wb, `edgevision_safety_report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = async () => {
    const res = await fetchViolations({ limit: 100 })
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('EdgeVision AI — Industrial Safety Compliance Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()} | Overall Compliance: ${stats?.compliance_rate || 95}%`, 14, 28)

    const tableData = res.data.map((v) => [
      new Date(v.created_at).toLocaleDateString(),
      v.violation_type?.replace(/_/g, ' '),
      v.severity?.toUpperCase(),
      v.camera_id || 'cam-01',
      v.worker_track_id || 'W-?',
      v.resolved ? 'RESOLVED' : 'ACTIVE',
    ])

    doc.autoTable({
      startY: 35,
      head: [['Date', 'Type', 'Severity', 'Camera', 'Worker', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [20, 23, 27], textColor: [242, 169, 0] },
    })

    doc.save(`edgevision_safety_report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const violationTypeData = Object.entries(stats?.by_type || {}).map(([type, count]) => ({
    name: type.replace(/_/g, ' '),
    value: count,
  }))

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-body">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-ink uppercase">DEEP SAFETY ANALYTICS</h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            TREND LINES, ZONE RISK MODELING, INCIDENT HEATMAPS, & AUDIT COMPLIANCE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe */}
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

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border hover:border-amber text-ink rounded font-mono text-xs transition-colors"
          >
            <FileSpreadsheet size={14} className="text-safe" />
            <span>Excel</span>
          </button>

          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border hover:border-amber text-ink rounded font-mono text-xs transition-colors"
          >
            <FileText size={14} className="text-critical" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Safety Score and Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-panel border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl tracking-wider text-ink uppercase">
              VIOLATION INCIDENCE TREND ({timeframe.toUpperCase()})
            </h2>
            <span className="font-mono text-xs text-amber font-bold">
              {stats?.total_violations || 0} TOTAL LOGGED
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trend_last_7_days || []}>
                <XAxis dataKey="date" stroke="#7B8288" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <YAxis stroke="#7B8288" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#14171B', borderColor: '#262B31', fontFamily: 'IBM Plex Mono' }}
                />
                <Line
                  type="monotone"
                  dataKey="violations"
                  stroke="#F2A900"
                  strokeWidth={2.5}
                  dot={{ fill: '#F2A900', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violations by Type Pie */}
        <div className="bg-panel border border-border rounded-lg p-6 flex flex-col justify-between">
          <h2 className="font-display text-xl tracking-wider text-ink uppercase mb-2">VIOLATION TYPE RATIO</h2>
          <div className="h-48 w-full">
            {violationTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center font-mono text-xs text-muted">
                No incidents recorded in period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={violationTypeData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {violationTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#14171B', borderColor: '#262B31', fontFamily: 'IBM Plex Mono' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 space-y-1 font-mono text-[11px] text-muted max-h-24 overflow-y-auto">
            {violationTypeData.map((d, i) => (
              <div key={d.name} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 capitalize">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="text-ink font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone-wise Bar Chart & Spatial Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-panel border border-border rounded-lg p-6">
          <h2 className="font-display text-xl tracking-wider text-ink uppercase mb-4">ZONE COMPLIANCE BURNDOWN</h2>
          <ZoneComplianceChart zoneStats={zoneStats} />
        </div>

        <div className="bg-panel border border-border rounded-lg p-6">
          <h2 className="font-display text-xl tracking-wider text-ink uppercase mb-4">SPATIAL HAZARD CLUSTER GRID</h2>
          <HeatmapChart heatmap={heatmap} />
        </div>
      </div>

      {/* Safety Intelligence Insights */}
      <div className="bg-panel border border-border rounded-lg p-6">
        <h2 className="font-display text-xl tracking-wider text-ink uppercase mb-4">RECOMMENDED MITIGATION ACTIONS</h2>
        <InsightsCard insights={insights} />
      </div>
    </div>
  )
}
