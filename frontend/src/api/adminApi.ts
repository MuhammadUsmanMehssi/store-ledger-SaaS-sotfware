import { apiClient, apiGet, apiPatch, apiPost, type ApiResult } from './client'
import type { ApiResponse, AdminStats, AdminTenant, ListParams } from '@/types'

export const adminApi = {
  stats: () => apiGet<AdminStats>('/admin/stats'),

  listTenants: (params?: ListParams) => apiGet<AdminTenant[]>('/admin/tenants', params),

  createTenant: (body: {
    name: string
    businessName?: string
    phone?: string
    email?: string
    address?: string
    currency?: string
    currencySymbol?: string
    ownerFullName: string
    ownerEmail: string
    ownerPassword: string
    ownerPhone?: string
    enabledModules?: AdminTenant['enabledModules']
  }) => apiPost<AdminTenant>('/admin/tenants', body),

  updateTenant: (
    id: string,
    body: Partial<
      Pick<AdminTenant, 'name' | 'businessName' | 'phone' | 'email' | 'address' | 'isActive' | 'enabledModules'>
    >,
  ) => apiPatch<AdminTenant>(`/admin/tenants/${id}`, body),

  uploadLogo: async (id: string, file: File): Promise<ApiResult<AdminTenant>> => {
    const formData = new FormData()
    formData.append('logo', file)
    const { data } = await apiClient.post<ApiResponse<AdminTenant>>(
      `/admin/tenants/${id}/logo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return { data: data.data, message: data.message, pagination: data.pagination }
  },
}
