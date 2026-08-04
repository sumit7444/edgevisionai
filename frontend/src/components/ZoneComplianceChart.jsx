import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { MapPin } from 'lucide-react'
import { fetchZoneStats } from '../api'

const TYPE_COLORS = {
  no_hardhat: '#E8432F',
  no_vest: '#F2A900',
  no_gloves: '#4A90D9',
  no_goggles: '#8B5CF6',
  no_mask: '#EC4899',
  smoke: '#F97316',
  zone_intrusion: '#E8432F',
}

export default function ZoneComplianceChart() {
  const [zones, setZones] = useState([])
  const [types, setTypes] = useState([])

  useEffect(() => {
    fetchZoneStats().then((r) => {
      setZones(r.data)
      const allTypes = new Set()
      r.data.forEach((z) => Object.keys(z.by_type).forEach((t) => allTypes.add(t)))
      setTypes([...allTypes])
    }).catch(() => {})
  }, [])

  const chartData = zones.map((z) => ({
    name: z.zone_name,
    ...z.by_type,
  }))

  return (
    <div className="panel-glass rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={15} className="text-amber" />
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">Zone-Wise Compliance</p>
      </div>
      {zones.length === 0 ? (
        <p className="text-xs font-mono text-muted">No zone-tagged violations yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, zones.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
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
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
            {types.map((t) => (
              <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t] || '#7B8288'} name={t.replace('_', ' ')} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] font-mono text-muted/60 mt-2">
        Includes zone intrusions and PPE violations that occurred inside a defined zone. "Unzoned" covers
        violations outside any zone.
      </p>
    </div>
  )
}