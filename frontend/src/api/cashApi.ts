import { apiGet, apiPatch, apiPost, createIdempotencyKey } from './client'
import type { CashSession } from '@/types'

export type CashSessionToday = CashSession & {
  canCancel?: boolean
}

export const cashApi = {
  today: () => apiGet<CashSessionToday | null>('/cash/today'),
  open: (
    body: { openingCash: number; notes?: string },
    options?: { idempotencyKey?: string },
  ) =>
    apiPost<CashSession>('/cash/open', body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  close: (
    body: { actualCash: number; notes?: string },
    options?: { idempotencyKey?: string },
  ) =>
    apiPost<CashSession>('/cash/close', body, {
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey(),
    }),
  reopen: () => apiPost<CashSession>('/cash/reopen'),
  cancel: () => apiPost<{ success: boolean; message: string }>('/cash/cancel'),
  updateOpening: (body: { openingCash: number; notes?: string }) =>
    apiPatch<CashSession>('/cash/opening', body),
  updateClosing: (body: { actualCash: number; notes?: string }) =>
    apiPatch<CashSession>('/cash/closing', body),
  summary: () => apiGet<CashSession>('/cash/summary'),
}
