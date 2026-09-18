import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { AlertProvider } from './context/AlertContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'

// Pages
import LoginPage from './pages/LoginPage.jsx'
import MainDashboardPage from './pages/MainDashboardPage.jsx'
import Dashboard from './pages/Dashboard.jsx' // Live Monitor Page
import AlertsCenterPage from './pages/AlertsCenterPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import CameraManagementPage from './pages/CameraManagementPage.jsx'
import WorkerMonitoringPage from './pages/WorkerMonitoringPage.jsx'
import RestrictedZonesPage from './pages/RestrictedZonesPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import IncidentDetailsPage from './pages/IncidentDetailsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import SystemHealthPage from './pages/SystemHealthPage.jsx'
import RemoteCamera from './pages/RemoteCamera.jsx'

const remoteCameraId = new URLSearchParams(window.location.search).get('remote')

function MainAppShell() {
  const { isAuthenticated, isLoading } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [selectedViolationId, setSelectedViolationId] = useState(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center font-mono text-xs text-amber animate-pulse">
        INITIALIZING EDGEVISION INDUSTRIAL TELEMETRY...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setTab('dashboard')} />
  }

  const navigateToViolation = (id) => {
    setSelectedViolationId(id)
    setTab('incident')
  }

  const getPageMeta = () => {
    switch (tab) {
      case 'dashboard':
        return { title: 'OPERATIONAL SAFETY DASHBOARD', subtitle: 'Site-wide Safety Overview & Telemetry' }
      case 'monitor':
        return { title: 'LIVE CAMERA MONITOR', subtitle: 'Real-time Optical Stream & Reticle Overlay' }
      case 'alerts':
        return { title: 'INCIDENT ALERTS CENTER', subtitle: 'Real-time Safety Escalations & Actions' }
      case 'violations':
        return { title: 'VIOLATION RECORDS LOG', subtitle: 'Filterable Safety Audit Log & Export' }
      case 'cameras':
        return { title: 'CAMERA STREAM MANAGEMENT', subtitle: 'RTSP, USB & Mobile Stream Hub' }
      case 'workers':
        return { title: 'OCCUPATIONAL WORKER ROSTER', subtitle: 'Biometric & Track Safety Compliance' }
      case 'zones':
        return { title: 'RESTRICTED SAFETY GEOFENCES', subtitle: 'Virtual Danger Perimeters & PPE Rules' }
      case 'analytics':
        return { title: 'PREDICTIVE SAFETY ANALYTICS', subtitle: 'Compliance Burndown, Heatmaps & Insights' }
      case 'incident':
        return { title: 'INCIDENT FORENSIC DETAILS', subtitle: 'Evidence Snapshot & Audit Trail' }
      case 'health':
        return { title: 'ENGINE SYSTEM HEALTH', subtitle: 'Hardware Acceleration & Diagnostics' }
      case 'settings':
        return { title: 'SYSTEM CONFIGURATION', subtitle: 'Inference Thresholds & Operator Settings' }
      default:
        return { title: 'EDGEVISION PLATFORM', subtitle: 'Industrial AI Worker Safety' }
    }
  }

  const { title, subtitle } = getPageMeta()

  return (
    <div className="min-h-screen bg-canvas flex overflow-x-hidden">
      <Sidebar active={tab} onChange={setTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          subtitle={subtitle}
          onNavigateAlerts={() => setTab('alerts')}
        />

        <main className="flex-1 overflow-y-auto bg-canvas">
          {tab === 'dashboard' && (
            <MainDashboardPage
              onNavigateTab={setTab}
              onSelectViolation={navigateToViolation}
            />
          )}
          {tab === 'monitor' && <Dashboard />}
          {tab === 'alerts' && (
            <AlertsCenterPage onSelectViolation={navigateToViolation} />
          )}
          {tab === 'violations' && (
            <HistoryPage onSelectViolation={navigateToViolation} />
          )}
          {tab === 'cameras' && (
            <CameraManagementPage
              onSwitchToCamera={(camId) => {
                setTab('monitor')
              }}
            />
          )}
          {tab === 'workers' && (
            <WorkerMonitoringPage
              onSelectWorkerViolations={(workerId) => setTab('violations')}
            />
          )}
          {tab === 'zones' && <RestrictedZonesPage />}
          {tab === 'analytics' && <AnalyticsPage />}
          {tab === 'incident' && (
            <IncidentDetailsPage
              violationId={selectedViolationId}
              onBack={() => setTab('violations')}
            />
          )}
          {tab === 'health' && <SystemHealthPage />}
          {tab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  if (remoteCameraId) {
    return <RemoteCamera cameraId={remoteCameraId} />
  }

  return (
    <AuthProvider>
      <AlertProvider>
        <MainAppShell />
      </AlertProvider>
    </AuthProvider>
  )
}