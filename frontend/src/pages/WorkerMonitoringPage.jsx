import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Trash2,
  Edit,
  History,
  CheckCircle2,
} from 'lucide-react'
import { fetchWorkers, createWorker, updateWorker, deleteWorker, fetchZones } from '../api'

export default function WorkerMonitoringPage({ onSelectWorkerViolations }) {
  const [workers, setWorkers] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const [empId, setEmpId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('Operations')
  const [assignedZone, setAssignedZone] = useState('')

  const loadData = async () => {
    try {
      const [workersRes, zonesRes] = await Promise.all([
        fetchWorkers(),
        fetchZones(),
      ])
      setWorkers(workersRes.data)
      setZones(zonesRes.data)
    } catch (e) {
      console.error('Error loading workers:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!empId.trim() || !name.trim()) return

    await createWorker({
      employee_id: empId,
      name,
      department,
      assigned_zone_id: assignedZone || null,
    })

    setEmpId('')
    setName('')
    setShowAddModal(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete worker from safety roster?')) {
      await deleteWorker(id)
      loadData()
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider text-ink uppercase">WORKER SAFETY MONITORING</h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">
            BIOMETRIC & TRACK ID OCCUPATIONAL HEALTH & SAFETY ROSTER
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber hover:bg-amber/90 text-canvas font-mono text-xs uppercase font-bold tracking-wider rounded transition-colors"
        >
          <UserPlus size={16} />
          <span>Enroll Personnel</span>
        </button>
      </div>

      {/* Workers Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workers.map((worker) => {
          const isSafe = worker.status === 'safe'
          return (
            <div
              key={worker.id}
              className="bg-panel border border-border rounded-lg p-5 flex flex-col justify-between hover:border-amber/40 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-mono text-sm font-bold text-ink">{worker.name}</h3>
                    <p className="font-mono text-[10px] text-amber tracking-wider uppercase font-semibold">
                      {worker.employee_id}
                    </p>
                  </div>

                  <span
                    className={`flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border uppercase ${
                      isSafe
                        ? 'border-safe/40 bg-safe/10 text-safe'
                        : 'border-critical/40 bg-critical/10 text-critical animate-pulse'
                    }`}
                  >
                    {isSafe ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                    <span>{isSafe ? 'COMPLIANT' : 'VIOLATION'}</span>
                  </span>
                </div>

                <div className="mt-4 space-y-2 font-mono text-xs bg-panel2 p-3 rounded border border-border/70 text-muted">
                  <div className="flex justify-between">
                    <span>Department:</span>
                    <span className="text-ink">{worker.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assigned Zone:</span>
                    <span className="text-ink truncate max-w-[130px]">
                      {zones.find((z) => z.id === worker.assigned_zone_id)?.name || 'General Facility'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Live Track ID:</span>
                    <span className="text-amber font-bold">{worker.active_track_id || 'Not in Frame'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between font-mono text-xs">
                <button
                  onClick={() => onSelectWorkerViolations && onSelectWorkerViolations(worker.id)}
                  className="flex items-center gap-1 text-amber hover:underline text-[11px]"
                >
                  <History size={13} />
                  <span>Violation Records</span>
                </button>

                <button
                  onClick={() => handleDelete(worker.id)}
                  className="text-muted hover:text-critical p-1 rounded transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Enroll Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-lg max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
            <h2 className="font-display text-2xl tracking-wider text-ink uppercase mb-4">ENROLL INDUSTRIAL WORKER</h2>
            <form onSubmit={handleEnroll} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-muted uppercase mb-1">Employee ID / Badge #</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-204"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted uppercase mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Michael Thorne"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted uppercase mb-1">Department / Trade</label>
                <input
                  type="text"
                  placeholder="e.g. High Voltage Maintenance"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-muted uppercase mb-1">Designated Work Zone</label>
                <select
                  value={assignedZone}
                  onChange={(e) => setAssignedZone(e.target.value)}
                  className="w-full bg-canvas border border-border rounded p-2.5 text-ink focus:border-amber focus:outline-none"
                >
                  <option value="">General Facility Floor (All Zones)</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.zone_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded bg-panel2 hover:bg-border text-muted uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-amber hover:bg-amber/90 text-canvas font-bold uppercase"
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
