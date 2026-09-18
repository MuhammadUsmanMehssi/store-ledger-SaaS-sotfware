import { apiGet } from './client'
import type { DashboardStats, DateRangeParams } from '@/types'

export const dashboardApi = {
  stats: (params?: DateRangeParams) =>
    apiGet<DashboardStats>(
      '/dashboard/stats',
      params as Record<string, string | undefined>,
    ),
}
