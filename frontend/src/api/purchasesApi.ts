import { apiGet, apiPatch, apiPost, createIdempotencyKey } from './client'
import type { ListParams, PaymentMethod, Purchase, PurchaseReturn } from '@/types'

export type PurchaseLineInput = {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

type IdempotentOptions = { idempotencyKey?: string }

export const purchasesApi = {
  list: (params?: ListParams & { status?: string; supplierId?: string }) =>
    apiGet<Purchase[]>('/purchases', params),
  get: (id: string) => apiGet<Purchase>(`/purchases/${id}`),
  create: (
    body: {
      supplierId?: string
      purchaseDate?: string
      discountAmount?: number
      taxAmount?: number
      paidAmount?: number
      paymentMethod?: PaymentMethod
      notes?: string
      status?: 'DRAFT' | 'COMPLETED'
      items: PurchaseLineInput[]
    },
    options?: IdempotentOptions,
  ) =>
    apiPost<Purchase>('/purchases', body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
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
    options?: IdempotentOptions,
  ) =>
    apiPost<Purchase>(`/purchases/${id}/complete`, body ?? {}, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  recordPayment: (
    id: string,
    body: { amount: number; paymentMethod?: PaymentMethod; notes?: string },
    options?: IdempotentOptions,
  ) =>
    apiPost<Purchase>(`/purchases/${id}/payments`, body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
}

export const purchaseReturnsApi = {
  list: (params?: ListParams & { purchaseId?: string }) =>
    apiGet<PurchaseReturn[]>('/purchase-returns', params),
  get: (id: string) => apiGet<PurchaseReturn>(`/purchase-returns/${id}`),
  create: (
    body: {
      purchaseId: string
      reason?: string
      items: Array<{ productId: string; quantity: number; unitPrice: number }>
    },
    options?: IdempotentOptions,
  ) =>
    apiPost<PurchaseReturn>('/purchase-returns', body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
}
