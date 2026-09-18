import { apiDelete, apiGet, apiPatch, apiPost, createIdempotencyKey } from './client'
import type { AccountTransaction, ListParams, PaymentMethod, Supplier } from '@/types'

export const suppliersApi = {
  list: (params?: ListParams & { isActive?: boolean }) =>
    apiGet<Supplier[]>('/suppliers', params),
  get: (id: string) => apiGet<Supplier>(`/suppliers/${id}`),
  create: (body: Partial<Supplier> & { name: string }) =>
    apiPost<Supplier>('/suppliers', body),
  update: (id: string, body: Partial<Supplier>) =>
    apiPatch<Supplier>(`/suppliers/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/suppliers/${id}`),
  payment: (
    id: string,
    body: { amount: number; paymentMethod: PaymentMethod; notes?: string },
    options?: { idempotencyKey?: string },
  ) =>
    apiPost<Supplier>(`/suppliers/${id}/payments`, body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  refund: (
    id: string,
    body: { amount: number; paymentMethod: PaymentMethod; notes?: string },
    options?: { idempotencyKey?: string },
  ) =>
    apiPost<{ amount: number; balanceAfter: number }>(`/suppliers/${id}/refunds`, body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  ledger: (id: string, params?: ListParams) =>
    apiGet<AccountTransaction[]>(`/suppliers/${id}/transactions`, params),
}
