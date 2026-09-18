import { apiDelete, apiGet, apiPatch, apiPost, createIdempotencyKey } from './client'
import type { AccountTransaction, Customer, ListParams, PaymentMethod } from '@/types'

export const customersApi = {
  list: (params?: ListParams & { isActive?: boolean }) =>
    apiGet<Customer[]>('/customers', params),
  get: (id: string) => apiGet<Customer>(`/customers/${id}`),
  create: (body: Partial<Customer> & { name: string }) =>
    apiPost<Customer>('/customers', body),
  update: (id: string, body: Partial<Customer>) =>
    apiPatch<Customer>(`/customers/${id}`, body),
  remove: (id: string) => apiDelete<null>(`/customers/${id}`),
  payment: (
    id: string,
    body: { amount: number; paymentMethod: PaymentMethod; notes?: string },
    options?: { idempotencyKey?: string },
  ) =>
    apiPost<Customer>(`/customers/${id}/payments`, body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  ledger: (id: string, params?: ListParams) =>
    apiGet<AccountTransaction[]>(`/customers/${id}/transactions`, params),
}
