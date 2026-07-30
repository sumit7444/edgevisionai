import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

export default function App() {
  const [tab, setTab] = useState('monitor')

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar active={tab} onChange={setTab} />
      {tab === 'monitor' ? <Dashboard /> : <HistoryPage />}
    </div>
  )
}
