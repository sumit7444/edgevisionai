import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import NotificationSettings from './NotificationSettings.jsx'

export default function TopBar({ connected, cameraId, alertCount }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="h-16 border-b border-border bg-panel/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h2 className="font-display text-2xl tracking-wide leading-none">LIVE MONITOR</h2>
        <p className="text-[11px] text-muted font-mono tracking-widest uppercase mt-0.5">
          Camera {cameraId}
        </p>
      </div>

      <div className="flex items-center gap-6">
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 font-mono text-xs text-critical">
            <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
            {alertCount} ACTIVE
          </div>
        )}

        <span className="font-mono text-xs text-muted tabular-nums">
          {now.toLocaleTimeString('en-IN', { hour12: false })}
        </span>

        <NotificationSettings />

        <div
          className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-sm border ${
            connected ? 'text-safe border-safe/30 bg-safe/10' : 'text-critical border-critical/30 bg-critical/10'
          }`}
        >
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>
    </header>
  )
}
