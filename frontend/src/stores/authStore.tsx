import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '@/api/authApi'
import { setUnauthorizedHandler } from '@/api/client'
import { ApiError } from '@/api/client'
import type { AuthPayload, Tenant, User } from '@/types'
import { clearTokens, getAccessToken, setTokens } from '@/utils/tokens'

type AuthState = {
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthPayload>
  register: (body: {
    fullName: string
    email: string
    password: string
    phone?: string
    storeName?: string
  }) => Promise<AuthPayload>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  setTenant: (tenant: Tenant | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

function applyAuth(payload: AuthPayload) {
  setTokens(payload.accessToken, payload.refreshToken)
  return payload
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    clearTokens()
    setUser(null)
    setTenant(null)
  }, [])

  const refreshMe = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      clearAuth()
      setIsLoading(false)
      return
    }
    try {
      const res = await authApi.me()
      setUser(res.data)
      setTenant((res.data.tenant as Tenant | null | undefined) ?? null)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 0)) {
        clearAuth()
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearAuth])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth()
    })
    void refreshMe()
    return () => setUnauthorizedHandler(null)
  }, [clearAuth, refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    applyAuth(res.data)
    setUser(res.data.user)
    setTenant(res.data.tenant ?? res.data.user.tenant ?? null)
    return res.data
  }, [])

  const register = useCallback(
    async (body: {
      fullName: string
      email: string
      password: string
      phone?: string
      storeName?: string
    }) => {
      const res = await authApi.register(body)
      applyAuth(res.data)
      setUser(res.data.user)
      setTenant(res.data.tenant ?? res.data.user.tenant ?? null)
      return res.data
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  const value = useMemo<AuthState>(
    () => ({
      user,
      tenant,
      isLoading,
      isAuthenticated: Boolean(user && getAccessToken()),
      login,
      register,
      logout,
      refreshMe,
      setTenant,
    }),
    [user, tenant, isLoading, login, register, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
