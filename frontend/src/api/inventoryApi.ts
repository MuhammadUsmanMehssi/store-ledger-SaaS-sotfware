import { apiGet, apiPost } from './client'
import type { ListParams, Product, StockMovement } from '@/types'

export const inventoryApi = {
  stock: (params?: ListParams & { lowStock?: boolean }) =>
    apiGet<Product[]>('/inventory/stock', params),
  movements: (params?: ListParams & { productId?: string; type?: string }) =>
    apiGet<StockMovement[]>('/inventory/movements', params),
  adjust: (body: {
    productId: string
    quantity: number
    reason: string
    notes?: string
  }) => apiPost<Product>('/inventory/adjust', body),
}
