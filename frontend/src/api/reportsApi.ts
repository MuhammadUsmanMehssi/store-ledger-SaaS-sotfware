import { apiGet } from './client'
import type { DateRangeParams, ReportResult } from '@/types'

export const reportsApi = {
  sales: (params?: DateRangeParams) =>
    apiGet<ReportResult>('/reports/sales', params as Record<string, string | undefined>),
  purchases: (params?: DateRangeParams) =>
    apiGet<ReportResult>('/reports/purchases', params as Record<string, string | undefined>),
  inventory: (params?: DateRangeParams) =>
    apiGet<ReportResult>('/reports/inventory', params as Record<string, string | undefined>),
  expenses: (params?: DateRangeParams) =>
    apiGet<ReportResult>('/reports/expenses', params as Record<string, string | undefined>),
  profitLoss: (params?: DateRangeParams) =>
    apiGet<ReportResult>('/reports/profit-loss', params as Record<string, string | undefined>),
}
