import { apiDelete, apiGet, apiPost } from './client'
import type {
  HeldSale,
  ListParams,
  PaymentMethod,
  Sale,
  SaleReturn,
} from '@/types'

export type SaleLineInput = {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

export const salesApi = {
  list: (params?: ListParams & {
    status?: string
    customerId?: string
    from?: string
    to?: string
  }) => apiGet<Sale[]>('/sales', params),
  get: (id: string) => apiGet<Sale>(`/sales/${id}`),
  create: (body: {
    customerId?: string | null
    discountAmount?: number
    taxAmount?: number
    paidAmount: number
    paymentMethod: PaymentMethod
    notes?: string
    items: SaleLineInput[]
  }) => apiPost<Sale>('/sales', body),
  listHeld: () => apiGet<HeldSale[]>('/sales/held'),
  hold: (body: {
    customerId?: string | null
    referenceName?: string
    discountAmount?: number
    notes?: string
    items: SaleLineInput[]
  }) => apiPost<HeldSale>('/sales/held', body),
  deleteHeld: (id: string) => apiDelete<null>(`/sales/held/${id}`),
  getHeld: (id: string) => apiGet<HeldSale>(`/sales/held/${id}`),
}

export const saleReturnsApi = {
  list: (params?: ListParams & { saleId?: string }) =>
    apiGet<SaleReturn[]>(`/sale-returns`, params),
  get: (id: string) => apiGet<SaleReturn>(`/sale-returns/${id}`),
  create: (body: {
    saleId: string
    reason?: string
    refundMethod?: PaymentMethod
    items: Array<{ productId: string; quantity: number; unitPrice: number }>
  }) => apiPost<SaleReturn>('/sale-returns', body),
}
