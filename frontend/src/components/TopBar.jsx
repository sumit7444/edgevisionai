import { useEffect, useState } from 'react'
import { Bell, Volume2, VolumeX, LogOut, User as UserIcon, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertContext.jsx'

export default function TopBar({ title = 'EDGEVISION DASHBOARD', subtitle = 'Industrial Safety System', onNavigateAlerts }) {
  const [now, setNow] = useState(new Date())
  const { user, logoutUser } = useAuth()
  const { unreadCount, soundEnabled, toggleSound } = useAlerts()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'border-critical/40 bg-critical/10 text-critical'
      case 'safety_officer':
        return 'border-amber/40 bg-amber/10 text-amber'
      default:
        return 'border-info/40 bg-info/10 text-info'
    }
  }

  return (
    <header className="h-16 border-b border-border bg-panel/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wider leading-none text-ink uppercase">{title}</h2>
          <p className="text-[10px] text-muted font-mono tracking-widest uppercase mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Time display */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-muted tabular-nums bg-panel2 px-2.5 py-1 rounded border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
          <span>{now.toLocaleTimeString('en-IN', { hour12: false })}</span>
          <span className="text-[9px] text-muted/70 ml-1">UTC+5:30</span>
        </div>

        {/* Audio Alert Toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Alert Chimes' : 'Enable Alert Chimes'}
          className={`p-2 rounded border transition-colors ${
            soundEnabled
              ? 'border-amber/40 text-amber bg-amber/10'
              : 'border-border text-muted hover:text-ink hover:bg-panel2'
          }`}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        {/* Alerts Pill */}
        <button
          onClick={onNavigateAlerts}
          className={`flex items-center gap-2 px-3 py-1 rounded font-mono text-xs border transition-colors ${
            unreadCount > 0
              ? 'border-critical/50 bg-critical/10 text-critical hover:bg-critical/20 animate-pulse'
              : 'border-border bg-panel2 text-muted hover:text-ink'
          }`}
        >
          <Bell size={14} />
          <span className="tabular-nums font-bold">{unreadCount}</span>
          <span className="hidden md:inline text-[10px] uppercase tracking-wider">Alerts</span>
        </button>

        {/* User Profile & Role */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-border">
            <div className="hidden lg:block text-right leading-tight">
              <p className="font-mono text-xs text-ink truncate max-w-[120px]">{user.full_name}</p>
              <span className={`inline-block font-mono text-[9px] px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                {user.role?.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={logoutUser}
              title="Sign Out"
              className="p-2 rounded border border-border text-muted hover:text-critical hover:border-critical/30 hover:bg-critical/10 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
