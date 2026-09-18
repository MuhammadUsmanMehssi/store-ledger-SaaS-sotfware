import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reportsApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReportSummaryCards, ReportTable } from '@/components/reports/ReportTable'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/hooks/useAuth'
import type { ReportResult } from '@/types'

const PRESETS = [
  { labelKey: 'common.today', value: 'today' },
  { labelKey: 'common.thisWeek', value: 'week' },
  { labelKey: 'common.thisMonth', value: 'month' },
  { labelKey: 'common.custom', value: 'custom' },
] as const

export default function SalesReportPage() {
  const { t } = useTranslation('reports')
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['value']>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const query = useQuery({
    queryKey: ['report-sales', preset, from, to],
    queryFn: async () =>
      (
        await reportsApi.sales({
          preset: preset === 'custom' ? 'custom' : preset,
          from: preset === 'custom' ? from : undefined,
          to: preset === 'custom' ? to : undefined,
        })
      ).data,
  })

  const data = query.data as ReportResult | undefined
  const rows = ((data?.items ?? data?.rows) as Array<Record<string, unknown>> | undefined) ?? []
  const summary = (data?.summary as Record<string, unknown> | undefined) ?? {}
  const page = data?.pagination?.page ?? 1
  const limit = data?.pagination?.limit ?? Math.max(rows.length, 1)
  const startIndex = (page - 1) * limit

  return (
    <div>
      <PageHeader title={t('sales.title')} description={t('sales.description')} />
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={preset === p.value ? 'primary' : 'outline'}
            onClick={() => setPreset(p.value)}
          >
            {t(p.labelKey)}
          </Button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
          <DatePicker label={t('common.from')} value={from} onChange={setFrom} />
          <DatePicker label={t('common.to')} value={to} onChange={setTo} />
        </div>
      ) : null}

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <EmptyState
          title={t('common.couldNotLoad')}
          actionLabel={t('common.retry')}
          onAction={() => void query.refetch()}
        />
      ) : (
        <>
          <ReportSummaryCards summary={summary} currencySymbol={symbol} />
          <ReportTable rows={rows} currencySymbol={symbol} startIndex={startIndex} />
        </>
      )}
    </div>
  )
}
