import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { fetchAlerts, fetchUnreadAlertCount, acknowledgeAlert as apiAck, resolveAlert as apiResolve, WS_BASE } from '../api'

const AlertContext = createContext(null)

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('edgevision_sound') === 'true')
  const wsRef = useRef(null)

  // Web Audio chime generator for industrial safety alert
  const playAlertSound = (severity = 'high') => {
    if (!soundEnabled) return
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()

      osc.type = severity === 'critical' ? 'sawtooth' : 'triangle'
      osc.frequency.setValueAtTime(severity === 'critical' ? 880 : 587.33, audioCtx.currentTime)
      if (severity === 'critical') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15)
      }

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35)

      osc.connect(gain)
      gain.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.35)
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('edgevision_sound', String(next))
      return next
    })
  }

  const addToast = (alert) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { id, ...alert }])
    playAlertSound(alert.severity)

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }

  const refreshAlerts = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        fetchAlerts({ limit: 50 }),
        fetchUnreadAlertCount(),
      ])
      setAlerts(listRes.data)
      setUnreadCount(countRes.data.unacknowledged_count)
    } catch {
      // Background sync fail silent
    }
  }

  useEffect(() => {
    refreshAlerts()
    const interval = setInterval(refreshAlerts, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleAcknowledge = async (id) => {
    try {
      await apiAck(id)
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (e) {
      console.error('Failed to acknowledge alert:', e)
    }
  }

  const handleResolve = async (id) => {
    try {
      await apiResolve(id)
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, resolved: true, acknowledged: true } : a))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (e) {
      console.error('Failed to resolve alert:', e)
    }
  }

  return (
    <AlertContext.Provider
      value={{
        alerts,
        unreadCount,
        toasts,
        soundEnabled,
        toggleSound,
        addToast,
        refreshAlerts,
        acknowledgeAlert: handleAcknowledge,
        resolveAlert: handleResolve,
        dismissToast: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
      }}
    >
      {children}
      {/* Toast Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded border backdrop-blur-md shadow-2xl flex items-start gap-3 animate-fade-in-up ${
              toast.severity === 'critical'
                ? 'bg-critical/20 border-critical/60 text-ink'
                : 'bg-panel/95 border-amber/50 text-ink'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                toast.severity === 'critical' ? 'bg-critical animate-ping' : 'bg-amber'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs uppercase tracking-wider font-bold text-amber">
                {toast.title || 'Safety Violation Detected'}
              </p>
              <p className="text-xs text-muted mt-0.5 leading-snug">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  )
}

export const useAlerts = () => {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlerts must be used within an AlertProvider')
  return ctx
}
