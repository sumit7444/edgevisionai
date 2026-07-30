import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

export const api = axios.create({ baseURL: API_BASE })

export const fetchViolations = (params = {}) => api.get('/api/violations', { params })
export const acknowledgeViolation = (id) => api.patch(`/api/violations/${id}/acknowledge`)
export const resolveViolation = (id) => api.patch(`/api/violations/${id}/resolve`)
export const fetchStats = () => api.get('/api/stats/summary')
export const fetchHeatmap = () => api.get('/api/stats/heatmap')
export const fetchInsights = () => api.get('/api/insights')
export const fetchZones = (cameraId) => api.get('/api/zones', { params: { camera_id: cameraId } })
export const createZone = (data) => api.post('/api/zones', data)
export const deleteZone = (id) => api.delete(`/api/zones/${id}`)
