import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip, BarChart, Bar, YAxis } from 'recharts'
import { ShieldCheck, AlertOctagon, TrendingUp, Users, Award, Target, Timer } from 'lucide-react'

function ComplianceGauge({ rate }) {
  const color = rate >= 85 ? '#2FB380' : rate >= 60 ? '#F2A900' : '#E8432F'
  return (
    <div className="panel-glass hover-lift rounded-sm p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">Compliance Rate</p>
        <ShieldCheck size={15} style={{ color }} strokeWidth={1.75} />
      </div>
      <div className="flex items-end gap-2 mt-2">
        <span className="font-display text-5xl leading-none tabular-nums" style={{ color }}>
          {rate}
        </span>
        <span className="text-muted mb-1">%</span>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full mt-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${rate}%`, background: color }}
        />
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, iconColor, label, value, unit, sub }) {
  return (
    <div className="panel-glass hover-lift rounded-sm p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">{label}</p>
        <Icon size={15} className={iconColor} strokeWidth={1.75} />
      </div>
      <div className="flex items-end gap-1 mt-2">
        <span className="font-display text-4xl leading-none text-ink tabular-nums">{value}</span>
        {unit && <span className="text-muted mb-0.5 text-sm">{unit}</span>}
      </div>
      {sub && <p className="font-mono text-[10px] text-muted mt-2">{sub}</p>}
    </div>
  )
}

function formatUptime(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function StatsCharts({ stats, activeWorkers = 0 }) {
  if (!stats) return null
  const byType = Object.entries(stats.by_type || {}).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }))

  const resolvedRate = stats.total_violations > 0 ? (stats.resolved_violations / stats.total_violations) * 100 : 100
  const safetyScore = Math.round(stats.compliance_rate * 0.7 + resolvedRate * 0.3)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} iconColor="text-info" label="Active Workers" value={activeWorkers} sub="Currently in frame" />
        <KpiCard icon={Award} iconColor="text-amber" label="Safety Score" value={safetyScore} unit="/100" sub="Compliance + resolution rate" />
        <KpiCard icon={Target} iconColor="text-safe" label="AI Accuracy" value={stats.avg_confidence} unit="%" sub="Avg. detection confidence" />
        <KpiCard icon={Timer} iconColor="text-muted" label="System Uptime" value={formatUptime(stats.uptime_seconds)} sub="Since last restart" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ComplianceGauge rate={stats.compliance_rate} />

        <div className="panel-glass hover-lift rounded-sm p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-muted uppercase tracking-widest">Violations Today</p>
            <AlertOctagon size={15} className="text-critical" strokeWidth={1.75} />
          </div>
          <p className="font-display text-5xl mt-2 text-ink tabular-nums">{stats.violations_today}</p>
          <p className="font-mono text-[11px] text-muted mt-3">{stats.total_violations} total logged</p>
        </div>

        <div className="panel-glass hover-lift rounded-sm p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[11px] text-muted uppercase tracking-widest">7-Day Trend</p>
            <TrendingUp size={15} className="text-amber" strokeWidth={1.75} />
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={stats.trend_last_7_days}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7B8288' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1B1F24', border: '1px solid #262B31', fontSize: 11 }}
                labelStyle={{ color: '#E8E9EA' }}
              />
              <Line type="monotone" dataKey="violations" stroke="#F2A900" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {byType.length > 0 && (
          <div className="panel-glass hover-lift rounded-sm p-4 md:col-span-4">
            <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-2">Violations by Type</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={byType} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#E8E9EA' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip contentStyle={{ background: '#1B1F24', border: '1px solid #262B31', fontSize: 11 }} />
                <Bar dataKey="value" fill="#E8432F" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
