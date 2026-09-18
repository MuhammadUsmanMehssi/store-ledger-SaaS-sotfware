import { apiGet, apiPatch, apiPost } from './client'
import type { ListParams, StoreRole, User, UserPermissionMap } from '@/types'

export const usersApi = {
  list: (params?: ListParams) => apiGet<User[]>('/users', params),
  create: (body: {
    fullName: string
    email: string
    password: string
    phone?: string
    storeRole: StoreRole
    permissions?: UserPermissionMap
  }) => apiPost<User>('/users', body),
  update: (
    id: string,
    body: Partial<{
      fullName: string
      phone: string
      storeRole: StoreRole
      isActive: boolean
      password: string
      permissions: UserPermissionMap | null
    }>,
  ) => apiPatch<User>(`/users/${id}`, body),
}
