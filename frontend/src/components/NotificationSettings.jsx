import { useEffect, useRef, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import {
  getNotificationSettings,
  setNotificationSettings,
  requestDesktopPermission,
} from '../utils/notifications'

export default function NotificationSettings() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(getNotificationSettings())
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const update = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setNotificationSettings(next)
  }

  const toggleDesktop = async () => {
    if (!settings.desktop) {
      const perm = await requestDesktopPermission()
      update({ desktop: perm === 'granted' })
    } else {
      update({ desktop: false })
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-muted hover:text-ink transition-colors"
        aria-label="Notification settings"
      >
        {settings.desktop || settings.sound ? <BellRing size={16} /> : <Bell size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-64 panel-glass rounded-sm p-3 z-30 animate-fade-in-up">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">Notifications</p>
          <label className="flex items-center justify-between py-1.5 cursor-pointer">
            <span className="text-xs">Desktop alerts</span>
            <input type="checkbox" checked={settings.desktop} onChange={toggleDesktop} className="accent-amber" />
          </label>
          <label className="flex items-center justify-between py-1.5 cursor-pointer">
            <span className="text-xs">Sound alerts</span>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => update({ sound: e.target.checked })}
              className="accent-amber"
            />
          </label>
        </div>
      )}
    </div>
  )
}
