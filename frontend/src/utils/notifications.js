const KEY = 'edgevision-notification-settings'

const DEFAULTS = { desktop: false, sound: true }

export function getNotificationSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function setNotificationSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}

export async function requestDesktopPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function fireViolationNotification(event) {
  const settings = getNotificationSettings()
  if (settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('EdgeVision AI — Safety Violation', {
      body: `${event.violation_type.replace('_', ' ')} detected (${Math.round(event.confidence * 100)}% confidence)`,
    })
  }
  if (settings.sound) {
    playBeep()
  }
}

let audioCtx = null

export function playBeep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.25)
  } catch {
    // audio not available — fail silently
  }
}
