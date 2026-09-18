import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { Category, ListParams } from '@/types'

export const categoriesApi = {
  list: (params?: ListParams) => apiGet<Category[]>('/categories', params),
  get: (id: string) => apiGet<Category>(`/categories/${id}`),
  create: (body: { name: string; description?: string; isActive?: boolean }) =>
    apiPost<Category>('/categories', body),
  update: (
    id: string,
    body: Partial<{ name: string; description: string; isActive: boolean }>,
  ) => apiPatch<Category>(`/categories/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/categories/${id}`),
}
