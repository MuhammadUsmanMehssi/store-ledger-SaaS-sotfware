import { apiGet, apiPost } from './client'
import type { AuthPayload, User } from '@/types'

export const authApi = {
  register: (body: {
    fullName: string
    email: string
    password: string
    phone?: string
    storeName?: string
  }) => apiPost<AuthPayload>('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    apiPost<AuthPayload>('/auth/login', body),

  refresh: (refreshToken: string) =>
    apiPost<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    }),

  logout: (refreshToken?: string) =>
    apiPost<null>('/auth/logout', { refreshToken }),

  me: () => apiGet<User>('/auth/me'),


  forgotPassword: (email: string) =>
    apiPost<{ resetToken?: string }>('/auth/forgot-password', { email }),

  resetPassword: (body: { token: string; password: string }) =>
    apiPost<null>('/auth/reset-password', body),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiPost<null>('/auth/change-password', body),
}
