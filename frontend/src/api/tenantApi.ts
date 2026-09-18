import { apiClient, apiGet, apiPatch, apiPost, type ApiResult } from './client'
import type { ApiResponse, Tenant } from '@/types'

export const tenantApi = {
  setup: (body: {
    name: string
    businessName?: string
    phone?: string
    email?: string
    address?: string
    currency?: string
    currencySymbol?: string
    taxEnabled?: boolean
    taxRate?: number
    invoicePrefix?: string
    purchasePrefix?: string
    receiptFooter?: string
    lowStockThreshold?: number
  }) => apiPost<Tenant>('/tenants', body),

  getSettings: () => apiGet<Tenant>('/tenants/settings'),

  updateSettings: (body: Partial<Tenant>) => apiPatch<Tenant>('/tenants/settings', body),

  uploadLogo: async (file: File): Promise<ApiResult<Tenant>> => {
    const formData = new FormData()
    formData.append('logo', file)
    const { data } = await apiClient.post<ApiResponse<Tenant>>('/tenants/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return { data: data.data, message: data.message, pagination: data.pagination }
  },
}
