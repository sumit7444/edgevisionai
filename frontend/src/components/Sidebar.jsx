import { Radar, History, ShieldAlert } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'monitor', label: 'Live Monitor', icon: Radar },
  { id: 'history', label: 'Violation Log', icon: History },
]

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="w-16 md:w-56 shrink-0 border-r border-border bg-panel flex flex-col">
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-border">
        <div className="w-8 h-8 rounded-sm bg-amber flex items-center justify-center shrink-0">
          <ShieldAlert size={18} className="text-canvas" strokeWidth={2.5} />
        </div>
        <div className="hidden md:block leading-none">
          <p className="font-display text-xl tracking-wide">EDGEVISION</p>
          <p className="font-mono text-[9px] text-muted tracking-[0.2em]">AI SAFETY SYSTEM</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
              active === id
                ? 'bg-amber/10 text-amber border border-amber/30'
                : 'text-muted hover:text-ink hover:bg-panel2 border border-transparent'
            }`}
          >
            <Icon size={16} strokeWidth={2} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border hidden md:block">
        <p className="font-mono text-[9px] text-muted tracking-widest leading-relaxed">
          BUILT BY SUMIT PRAJAPATI
        </p>
      </div>
    </aside>
  )
}
