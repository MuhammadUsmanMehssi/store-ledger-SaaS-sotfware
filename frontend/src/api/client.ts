import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/utils/tokens'
import type { ApiResponse, AuthTokens } from '@/types'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 30000,
})

let refreshPromise: Promise<string | null> | null = null
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<ApiResponse<AuthTokens>>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    if (!data.success || !data.data?.accessToken) {
      clearTokens()
      return null
    }
    setTokens(data.data.accessToken, data.data.refreshToken)
    return data.data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

function ensureRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Let the browser set multipart boundary for FormData uploads
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.set === 'function') {
      config.headers.set('Content-Type', false)
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type']
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const newToken = await ensureRefresh()
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      }
      clearTokens()
      onUnauthorized?.()
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    throw new ApiError(message, error.response?.status ?? 0, error.response?.data)
  },
)

export type ApiResult<T> = {
  data: T
  message: string
  pagination?: ApiResponse<T>['pagination']
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<ApiResult<T>> {
  const cleaned: Record<string, string | number | boolean> = {}
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue
      cleaned[k] = v
    }
  }
  const { data } = await apiClient.get<ApiResponse<T>>(url, { params: cleaned })
  return { data: data.data, message: data.message, pagination: data.pagination }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body)
  return { data: data.data, message: data.message, pagination: data.pagination }
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body)
  return { data: data.data, message: data.message, pagination: data.pagination }
}

export async function apiPut<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  const { data } = await apiClient.put<ApiResponse<T>>(url, body)
  return { data: data.data, message: data.message, pagination: data.pagination }
}

export async function apiDelete<T>(url: string): Promise<ApiResult<T>> {
  const { data } = await apiClient.delete<ApiResponse<T>>(url)
  return { data: data.data, message: data.message, pagination: data.pagination }
}
