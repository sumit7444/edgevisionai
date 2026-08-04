import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import RemoteCamera from './pages/RemoteCamera.jsx'

const remoteCameraId = new URLSearchParams(window.location.search).get('remote')

export default function App() {
  const [tab, setTab] = useState('monitor')

  // A phone opening the shared remote-camera link (?remote=cam-02) gets the
  // minimal capture page instead of the full dashboard — no sidebar needed.
  if (remoteCameraId) {
    return <RemoteCamera cameraId={remoteCameraId} />
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar active={tab} onChange={setTab} />
      {tab === 'monitor' ? <Dashboard /> : <HistoryPage />}
    </div>
  )
}