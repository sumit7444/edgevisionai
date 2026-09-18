import {
  LayoutDashboard,
  Radar,
  BellRing,
  History,
  Camera,
  Users,
  ShieldAlert,
  BarChart3,
  FileSearch,
  Settings,
  Activity,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertContext.jsx'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Overview' },
  { id: 'monitor', label: 'Live Monitor', icon: Radar, category: 'Real-time' },
  { id: 'alerts', label: 'Alerts Center', icon: BellRing, badge: true, category: 'Real-time' },
  { id: 'violations', label: 'Violation History', icon: History, category: 'Safety Records' },
  { id: 'cameras', label: 'Cameras', icon: Camera, category: 'Infrastructure' },
  { id: 'workers', label: 'Worker Roster', icon: Users, category: 'Infrastructure' },
  { id: 'zones', label: 'Restricted Zones', icon: ShieldAlert, category: 'Infrastructure' },
  { id: 'analytics', label: 'Deep Analytics', icon: BarChart3, category: 'Intelligence' },
  { id: 'incident', label: 'Incident Details', icon: FileSearch, category: 'Intelligence' },
  { id: 'health', label: 'System Health', icon: Activity, category: 'System' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'System' },
]

export default function Sidebar({ active, onChange }) {
  const { user, logoutUser } = useAuth()
  const { unreadCount } = useAlerts()

  return (
    <aside className="w-16 md:w-60 shrink-0 border-r border-border bg-panel flex flex-col h-screen sticky top-0 select-none z-40">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
        <div className="w-9 h-9 rounded bg-amber flex items-center justify-center shrink-0 shadow-lg shadow-amber/10">
          <ShieldAlert size={20} className="text-canvas" strokeWidth={2.5} />
        </div>
        <div className="hidden md:block leading-none">
          <p className="font-display text-xl tracking-wider text-ink">EDGEVISION</p>
          <p className="font-mono text-[9px] text-amber tracking-[0.25em] font-semibold">AI SAFETY SYSTEM</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded font-mono text-xs uppercase tracking-wider transition-all duration-150 ${
                isActive
                  ? 'bg-amber/10 text-amber border border-amber/40 shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-panel2 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-amber' : 'text-muted'} />
                <span className="hidden md:inline truncate">{label}</span>
              </div>

              {badge && unreadCount > 0 && (
                <span className="hidden md:flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-critical text-canvas font-mono animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-border hidden md:block bg-panel/50">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-muted tracking-widest uppercase">INDUSTRIAL v1.2</span>
          <span className="inline-block w-2 h-2 rounded-full bg-safe animate-pulse" />
        </div>
        <p className="font-mono text-[9px] text-muted/60 tracking-wider">
          EDGE VISION AI ARCHITECTURE
        </p>
      </div>
    </aside>
  )
}
