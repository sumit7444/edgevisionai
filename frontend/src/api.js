import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

export const api = axios.create({ baseURL: API_BASE })

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edgevision_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for automatic 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Don't loop if login endpoint fails
      if (!error.config.url.includes('/api/auth/login')) {
        localStorage.removeItem('edgevision_token')
        localStorage.removeItem('edgevision_user')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  }
)

// =====================
// AUTH APIs
// =====================
export const login = (email, password) => api.post('/api/auth/login', { email, password })
export const fetchCurrentUser = () => api.get('/api/auth/me')
export const refreshToken = () => api.post('/api/auth/refresh')
export const fetchUsers = () => api.get('/api/auth/users')
export const createUser = (data) => api.post('/api/auth/users', data)

// =====================
// VIOLATIONS APIs
// =====================
export const fetchViolations = (params = {}) => api.get('/api/violations', { params })
export const fetchViolation = (id) => api.get(`/api/violations/${id}`)
export const createViolation = (data) => api.post('/api/violations', data)
export const acknowledgeViolation = (id) => api.patch(`/api/violations/${id}/acknowledge`)
export const resolveViolation = (id) => api.patch(`/api/violations/${id}/resolve`)
export const deleteViolation = (id) => api.delete(`/api/violations/${id}`)
export const clearViolations = (params = {}) => api.delete('/api/violations', { params })

// =====================
// ALERTS APIs
// =====================
export const fetchAlerts = (params = {}) => api.get('/api/alerts', { params })
export const fetchUnreadAlertCount = () => api.get('/api/alerts/unread-count')
export const createAlert = (data) => api.post('/api/alerts', data)
export const acknowledgeAlert = (id) => api.patch(`/api/alerts/${id}/acknowledge`)
export const resolveAlert = (id) => api.patch(`/api/alerts/${id}/resolve`)
export const deleteAlert = (id) => api.delete(`/api/alerts/${id}`)

// =====================
// CAMERAS APIs
// =====================
export const fetchCameras = () => api.get('/api/cameras')
export const fetchCamera = (id) => api.get(`/api/cameras/${id}`)
export const createCamera = (data) => api.post('/api/cameras', data)
export const updateCamera = (id, data) => api.put(`/api/cameras/${id}`, data)
export const setCameraStatus = (id, status) => api.patch(`/api/cameras/${id}/status?status_value=${status}`)
export const deleteCamera = (id) => api.delete(`/api/cameras/${id}`)
export const fetchCameraHealth = (id) => api.get(`/api/cameras/${id}/health`)

// =====================
// WORKERS APIs
// =====================
export const fetchWorkers = (params = {}) => api.get('/api/workers', { params })
export const fetchWorker = (id) => api.get(`/api/workers/${id}`)
export const createWorker = (data) => api.post('/api/workers', data)
export const updateWorker = (id, data) => api.put(`/api/workers/${id}`, data)
export const deleteWorker = (id) => api.delete(`/api/workers/${id}`)
export const fetchWorkerViolations = (id) => api.get(`/api/workers/${id}/violations`)

// =====================
// ZONES APIs
// =====================
export const fetchZones = (cameraId) => api.get('/api/zones', { params: cameraId ? { camera_id: cameraId } : {} })
export const fetchZone = (id) => api.get(`/api/zones/${id}`)
export const createZone = (data) => api.post('/api/zones', data)
export const updateZone = (id, data) => api.put(`/api/zones/${id}`, data)
export const deleteZone = (id) => api.delete(`/api/zones/${id}`)

// =====================
// STATS & ANALYTICS APIs
// =====================
export const fetchStats = (timeframe = '7d') => api.get('/api/stats/summary', { params: { timeframe } })
export const fetchHeatmap = () => api.get('/api/stats/heatmap')
export const fetchZoneStats = () => api.get('/api/stats/by-zone')
export const fetchInsights = () => api.get('/api/insights')

// =====================
// AUDIT & HEALTH APIs
// =====================
export const fetchAuditLogs = (params = {}) => api.get('/api/audit-logs', { params })
export const fetchSystemHealth = () => api.get('/api/health/system')
export const fetchReadiness = () => api.get('/api/health/ready')