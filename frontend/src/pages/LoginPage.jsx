import { useState } from 'react'
import { ShieldAlert, Lock, Mail, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { loginUser } = useAuth()

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginUser(email, password)
      if (onLoginSuccess) onLoginSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
    setLoading(true)
    loginUser(demoEmail, demoPassword)
      .then(() => {
        if (onLoginSuccess) onLoginSuccess()
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Quick login failed')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Background blueprint grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#262B31_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Decorative safety hazard bar top & bottom */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-hazard opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-hazard opacity-80" />

      <div className="w-full max-w-md bg-panel border border-border rounded-lg shadow-2xl p-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded bg-amber flex items-center justify-center shadow-lg shadow-amber/20">
            <ShieldAlert size={26} className="text-canvas" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-wider text-ink leading-none">EDGEVISION AI</h1>
            <p className="font-mono text-xs text-amber tracking-[0.2em] font-semibold mt-1">
              ENTERPRISE SAFETY PLATFORM
            </p>
          </div>
        </div>

        <div className="mb-6 p-3 rounded bg-panel2 border border-border text-xs text-muted leading-relaxed">
          Authorized personnel only. All access, camera streams, and incident acknowledgments are cryptographically audited.
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded bg-critical/10 border border-critical/40 flex items-start gap-2.5 text-critical text-xs font-mono animate-fade-in-up">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="safety.officer@edgevision.ai"
                className="w-full bg-canvas border border-border rounded px-3.5 py-2.5 pl-10 text-ink font-mono text-xs focus:outline-none focus:border-amber transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
              Access Token / Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-canvas border border-border rounded px-3.5 py-2.5 pl-10 text-ink font-mono text-xs focus:outline-none focus:border-amber transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-widest rounded flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-canvas border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Authenticate Operator</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Shortcuts */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest text-center mb-3">
            Fast Demo Login Shortcuts
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@edgevision.ai', 'Admin@123456')}
              className="p-2.5 rounded bg-panel2 hover:bg-border/60 border border-border text-left transition-colors"
            >
              <p className="font-mono text-xs text-ink font-bold">Admin Account</p>
              <p className="font-mono text-[10px] text-muted">Full privileges</p>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('officer@edgevision.ai', 'Safety@123456')}
              className="p-2.5 rounded bg-panel2 hover:bg-border/60 border border-border text-left transition-colors"
            >
              <p className="font-mono text-xs text-ink font-bold">Safety Officer</p>
              <p className="font-mono text-[10px] text-muted">Operations & alerts</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
