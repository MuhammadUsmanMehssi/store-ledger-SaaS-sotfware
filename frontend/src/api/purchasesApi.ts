import { apiGet, apiPatch, apiPost } from './client'
import type { ListParams, PaymentMethod, Purchase, PurchaseReturn } from '@/types'

export type PurchaseLineInput = {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

export const purchasesApi = {
  list: (params?: ListParams & { status?: string; supplierId?: string }) =>
    apiGet<Purchase[]>('/purchases', params),
  get: (id: string) => apiGet<Purchase>(`/purchases/${id}`),
  create: (body: {
    supplierId?: string
    purchaseDate?: string
    discountAmount?: number
    taxAmount?: number
    paidAmount?: number
    paymentMethod?: PaymentMethod
    notes?: string
    status?: 'DRAFT' | 'COMPLETED'
    items: PurchaseLineInput[]
  }) => apiPost<Purchase>('/purchases', body),
  update: (
    id: string,
    body: {
      supplierId?: string | null
      paidAmount?: number
      paymentMethod?: PaymentMethod
      notes?: string | null
      items: PurchaseLineInput[]
    },
  ) => apiPatch<Purchase>(`/purchases/${id}`, body),
  complete: (
    id: string,
    body?: { paidAmount?: number; paymentMethod?: PaymentMethod },
  ) => apiPost<Purchase>(`/purchases/${id}/complete`, body ?? {}),
  recordPayment: (
    id: string,
    body: { amount: number; paymentMethod?: PaymentMethod; notes?: string },
  ) => apiPost<Purchase>(`/purchases/${id}/payments`, body),
}

export const purchaseReturnsApi = {
  list: (params?: ListParams & { purchaseId?: string }) =>
    apiGet<PurchaseReturn[]>('/purchase-returns', params),
  get: (id: string) => apiGet<PurchaseReturn>(`/purchase-returns/${id}`),
  create: (body: {
    purchaseId: string
    reason?: string
    items: Array<{ productId: string; quantity: number; unitPrice: number }>
  }) => apiPost<PurchaseReturn>('/purchase-returns', body),
}
