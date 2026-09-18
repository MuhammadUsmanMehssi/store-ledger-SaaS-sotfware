import { apiDelete, apiGet, apiPatch, apiPost } from './client'
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
  ) => apiPost<Supplier>(`/suppliers/${id}/payments`, body),
  refund: (
    id: string,
    body: { amount: number; paymentMethod: PaymentMethod; notes?: string },
  ) => apiPost<{ amount: number; balanceAfter: number }>(`/suppliers/${id}/refunds`, body),
  ledger: (id: string, params?: ListParams) =>
    apiGet<AccountTransaction[]>(`/suppliers/${id}/transactions`, params),
}
