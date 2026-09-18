import { useState } from 'react'
import {
  Settings,
  User,
  Sliders,
  Bell,
  SlidersHorizontal,
  Shield,
  Check,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAlerts } from '../context/AlertContext.jsx'

export default function SettingsPage() {
  const { user } = useAuth()
  const { soundEnabled, toggleSound } = useAlerts()

  // Tunable safety threshold state
  const [confidenceThresh, setConfidenceThresh] = useState(
    () => parseFloat(localStorage.getItem('edgevision_conf') || '0.45')
  )
  const [iouThresh, setIouThresh] = useState(
    () => parseFloat(localStorage.getItem('edgevision_iou') || '0.45')
  )
  const [cooldownSec, setCooldownSec] = useState(
    () => parseInt(localStorage.getItem('edgevision_cooldown') || '8', 10)
  )
  const [reducedMotion, setReducedMotion] = useState(
    () => localStorage.getItem('edgevision_reduced_motion') === 'true'
  )
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('edgevision_conf', confidenceThresh.toString())
    localStorage.setItem('edgevision_iou', iouThresh.toString())
    localStorage.setItem('edgevision_cooldown', cooldownSec.toString())
    localStorage.setItem('edgevision_reduced_motion', String(reducedMotion))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto font-body">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl tracking-wider text-ink uppercase">SETTINGS & SYSTEM PROFILE</h1>
        <p className="font-mono text-xs text-muted tracking-wider mt-1">
          OPERATOR CREDENTIALS, INFERENCE PARAMETERS, & ACCESSIBILITY CONTROLS
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-safe/10 border border-safe/40 rounded flex items-center gap-2 text-safe font-mono text-xs animate-fade-in-up">
          <Check size={16} />
          <span>System configuration preferences persisted successfully.</span>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-panel border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User size={18} className="text-amber" />
          <h2 className="font-display text-xl tracking-wider text-ink uppercase">OPERATOR CREDENTIALS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs bg-panel2 p-4 rounded border border-border">
          <div>
            <span className="text-muted block mb-1 uppercase text-[10px]">Full Name</span>
            <span className="text-ink font-bold text-sm">{user?.full_name || 'System Operator'}</span>
          </div>
          <div>
            <span className="text-muted block mb-1 uppercase text-[10px]">Email Address</span>
            <span className="text-ink">{user?.email || 'operator@edgevision.ai'}</span>
          </div>
          <div>
            <span className="text-muted block mb-1 uppercase text-[10px]">Role Privileges</span>
            <span className="inline-block px-2 py-0.5 rounded bg-amber/20 text-amber border border-amber/40 uppercase font-bold text-[10px]">
              {user?.role || 'Safety Officer'}
            </span>
          </div>
          <div>
            <span className="text-muted block mb-1 uppercase text-[10px]">Session Security</span>
            <span className="text-safe">Active HMAC-SHA256 JWT</span>
          </div>
        </div>
      </div>

      {/* AI Inference Thresholds */}
      <div className="bg-panel border border-border rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-amber" />
          <h2 className="font-display text-xl tracking-wider text-ink uppercase">YOLO AI DETECTION TUNING</h2>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-ink">Detection Confidence Cutoff</span>
            <span className="text-amber font-bold">{Math.round(confidenceThresh * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={confidenceThresh}
            onChange={(e) => setConfidenceThresh(parseFloat(e.target.value))}
            className="w-full accent-amber cursor-pointer"
          />
          <p className="text-[11px] text-muted">
            Detections below this probability threshold are filtered to prevent false positive triggers.
          </p>
        </div>

        {/* IoU Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-ink">IoU Non-Maximum Suppression Threshold</span>
            <span className="text-amber font-bold">{Math.round(iouThresh * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.20"
            max="0.80"
            step="0.05"
            value={iouThresh}
            onChange={(e) => setIouThresh(parseFloat(e.target.value))}
            className="w-full accent-amber cursor-pointer"
          />
          <p className="text-[11px] text-muted">
            Boxes overlapping by greater than this IoU score are deduplicated.
          </p>
        </div>

        {/* Cooldown */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-ink">Violation Logging Cooldown</span>
            <span className="text-amber font-bold">{cooldownSec} Seconds</span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={cooldownSec}
            onChange={(e) => setCooldownSec(parseInt(e.target.value, 10))}
            className="w-full accent-amber cursor-pointer"
          />
          <p className="text-[11px] text-muted">
            Suppresses repeated database writes and alerts for persistent in-frame infractions.
          </p>
        </div>
      </div>

      {/* Accessibility & Audio Controls */}
      <div className="bg-panel border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-amber" />
          <h2 className="font-display text-xl tracking-wider text-ink uppercase">ALERT NOTIFICATIONS & ACCESSIBILITY</h2>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <label className="flex items-center justify-between p-3 rounded bg-panel2 border border-border cursor-pointer">
            <div>
              <span className="text-ink block">Synthesized Audio Alert Chimes</span>
              <span className="text-[11px] text-muted">Play acoustic alarm tone when critical infractions occur</span>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={toggleSound}
              className="accent-amber w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded bg-panel2 border border-border cursor-pointer">
            <div>
              <span className="text-ink block">Reduced Motion Mode</span>
              <span className="text-[11px] text-muted">Disable pulses and transitions for performance & accessibility</span>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="accent-amber w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-widest rounded transition-colors shadow-lg"
        >
          Save Preferences
        </button>
      </div>
    </div>
  )
}
