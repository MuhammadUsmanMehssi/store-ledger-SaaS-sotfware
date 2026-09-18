import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { Brand, ListParams } from '@/types'

export const brandsApi = {
  list: (params?: ListParams & { isActive?: boolean }) => apiGet<Brand[]>('/brands', params),
  get: (id: string) => apiGet<Brand>(`/brands/${id}`),
  create: (body: { name: string; description?: string; isActive?: boolean }) =>
    apiPost<Brand>('/brands', body),
  update: (
    id: string,
    body: Partial<{ name: string; description: string; isActive: boolean }>,
  ) => apiPatch<Brand>(`/brands/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/brands/${id}`),
}
