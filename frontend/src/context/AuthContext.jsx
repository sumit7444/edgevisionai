import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, fetchCurrentUser } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('edgevision_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('edgevision_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('edgevision_token')
      if (savedToken) {
        try {
          const res = await fetchCurrentUser()
          setUser(res.data)
          localStorage.setItem('edgevision_user', JSON.stringify(res.data))
        } catch {
          // Token expired or invalid
          logoutUser()
        }
      }
      setIsLoading(false)
    }

    initAuth()

    const handleUnauthorized = () => {
      logoutUser()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  const loginUser = async (email, password) => {
    const res = await apiLogin(email, password)
    const { access_token, user: userData } = res.data
    localStorage.setItem('edgevision_token', access_token)
    localStorage.setItem('edgevision_user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
    return userData
  }

  const logoutUser = () => {
    localStorage.removeItem('edgevision_token')
    localStorage.removeItem('edgevision_user')
    setToken(null)
    setUser(null)
  }

  const hasRole = (allowedRoles) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return allowedRoles.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        loginUser,
        logoutUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
