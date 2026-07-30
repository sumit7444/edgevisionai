import { useEffect, useState } from 'react'
import { Sparkles, TriangleAlert } from 'lucide-react'
import { fetchInsights } from '../api'

const SEVERITY_COLOR = {
  high: 'border-l-critical',
  medium: 'border-l-amber',
  low: 'border-l-safe',
}

export default function InsightsCard() {
  const [insights, setInsights] = useState([])

  useEffect(() => {
    fetchInsights().then((r) => setInsights(r.data)).catch(() => {})
  }, [])

  return (
    <div className="panel-glass rounded-sm">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles size={16} className="text-amber" />
        <h2 className="font-display text-lg tracking-wide">SAFETY INSIGHTS</h2>
      </div>
      <div className="p-3 space-y-2">
        {insights.length === 0 && <p className="text-xs font-mono text-muted p-2">Analyzing recent activity…</p>}
        {insights.map((ins) => (
          <div
            key={ins.id}
            className={`border-l-2 ${SEVERITY_COLOR[ins.severity] || 'border-l-border'} bg-panel2 rounded-sm p-3 animate-fade-in-up`}
          >
            <div className="flex items-center gap-1.5">
              <TriangleAlert size={12} className="text-muted" />
              <p className="font-mono text-xs uppercase tracking-wide">{ins.title}</p>
            </div>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">{ins.message}</p>
          </div>
        ))}
      </div>
      <p className="px-4 pb-3 text-[10px] font-mono text-muted/50">
        Rule-based recommendations from recent violation trends — not a language model.
      </p>
    </div>
  )
}
