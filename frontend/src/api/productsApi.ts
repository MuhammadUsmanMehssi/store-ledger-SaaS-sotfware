import { apiClient, apiDelete, apiGet, apiPatch, apiPost, type ApiResult } from './client'
import type { ApiResponse, ListParams, Product, Unit } from '@/types'

export const unitsApi = {
  list: (params?: ListParams) => apiGet<Unit[]>('/units', params),
  get: (id: string) => apiGet<Unit>(`/units/${id}`),
  create: (body: { name: string; abbreviation: string; isActive?: boolean }) =>
    apiPost<Unit>('/units', body),
  update: (
    id: string,
    body: Partial<{ name: string; abbreviation: string; isActive: boolean }>,
  ) => apiPatch<Unit>(`/units/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/units/${id}`),
}

function appendProductFields(formData: FormData, body: Record<string, unknown>) {
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || key === 'imageUrl') continue
    formData.append(key, typeof value === 'string' ? value : String(value))
  }
}

export const productsApi = {
  list: (params?: ListParams & { categoryId?: string; brandId?: string; isActive?: boolean }) =>
    apiGet<Product[]>('/products', params),
  get: (id: string) => apiGet<Product>(`/products/${id}`),
  byBarcode: (barcode: string) =>
    apiGet<Product>(`/products/barcode/${encodeURIComponent(barcode)}`),
  create: (body: Record<string, unknown>, image?: File | null) => {
    if (!image) return apiPost<Product>('/products', body)
    const formData = new FormData()
    appendProductFields(formData, body)
    formData.append('image', image)
    return apiClient
      .post<ApiResponse<Product>>('/products', formData)
      .then(({ data }) => ({
        data: data.data,
        message: data.message,
        pagination: data.pagination,
      }))
  },
  update: (id: string, body: Record<string, unknown>, image?: File | null) => {
    if (!image) return apiPatch<Product>(`/products/${id}`, body)
    const formData = new FormData()
    appendProductFields(formData, body)
    formData.append('image', image)
    return apiClient
      .patch<ApiResponse<Product>>(`/products/${id}`, formData)
      .then(({ data }) => ({
        data: data.data,
        message: data.message,
        pagination: data.pagination,
      }))
  },
  remove: (id: string) => apiDelete<null>(`/products/${id}`),
  generateCodes: (body: {
    name: string
    flavor?: string | null
    size?: string | null
    fields?: 'sku' | 'barcode' | 'both'
    excludeProductId?: string
  }) =>
    apiPost<{ sku?: string; barcode?: string }>('/products/codes/generate', body),
  createVariants: (
    body: {
      name: string
      categoryId?: string | null
      brandId?: string | null
      flavor?: string | null
      unitId?: string | null
      description?: string | null
      isActive?: boolean
      variants: Array<{
        size: string
        sku?: string
        barcode?: string
        purchasePrice?: number
        salePrice: number
        minimumStock?: number
        currentStock?: number
      }>
    },
    image?: File | null,
  ) => {
    if (!image) return apiPost<Product[]>('/products/variants', body)
    const formData = new FormData()
    formData.append('payload', JSON.stringify(body))
    formData.append('image', image)
    return apiClient
      .post<ApiResponse<Product[]>>('/products/variants', formData)
      .then(({ data }) => ({
        data: data.data,
        message: data.message,
        pagination: data.pagination,
      }))
  },
  uploadImage: async (id: string, file: File): Promise<ApiResult<Product>> => {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await apiClient.post<ApiResponse<Product>>(`/products/${id}/image`, formData)
    return { data: data.data, message: data.message, pagination: data.pagination }
  },
}
