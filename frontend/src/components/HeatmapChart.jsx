import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { fetchHeatmap } from '../api'

export default function HeatmapChart() {
  const [cells, setCells] = useState([])

  useEffect(() => {
    fetchHeatmap().then((r) => setCells(r.data)).catch(() => {})
  }, [])

  const max = Math.max(1, ...cells.map((c) => c.count))
  const cols = Math.max(1, ...cells.map((c) => c.col + 1))

  return (
    <div className="panel-glass rounded-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={15} className="text-critical" />
        <p className="font-mono text-[11px] text-muted uppercase tracking-widest">
          Violation Hotspots (frame position)
        </p>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((c, i) => {
          const intensity = c.count / max
          return (
            <div
              key={i}
              title={`${c.count} violation${c.count !== 1 ? 's' : ''}`}
              className="aspect-video rounded-sm flex items-center justify-center transition-colors"
              style={{
                background:
                  c.count === 0
                    ? 'rgba(38,43,49,0.5)'
                    : `rgba(232, 67, 47, ${0.15 + intensity * 0.65})`,
              }}
            >
              {c.count > 0 && <span className="font-mono text-[10px] text-ink/80">{c.count}</span>}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] font-mono text-muted/60 mt-2">
        Grid maps where in the camera frame violations were detected — darker cells occur more often.
      </p>
    </div>
  )
}
