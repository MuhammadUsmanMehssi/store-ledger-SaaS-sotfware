import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reportsApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DatePicker } from '@/components/ui/DatePicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'

const PRESETS = [
  { labelKey: 'common.today', value: 'today' },
  { labelKey: 'common.thisWeek', value: 'week' },
  { labelKey: 'common.thisMonth', value: 'month' },
  { labelKey: 'common.custom', value: 'custom' },
] as const

type ProfitLossData = {
  range?: { from: string; to: string }
  revenue?: number
  returns?: number
  netSales?: number
  cogs?: number
  grossProfit?: number
  expenses?: number
  netProfit?: number
  note?: string
}

function Line({
  label,
  value,
  symbol,
  tone = 'default',
  strong = false,
}: {
  label: string
  value: number
  symbol: string
  tone?: 'default' | 'muted' | 'success' | 'danger'
  strong?: boolean
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'muted'
          ? 'text-fg-muted'
          : 'text-fg'

  return (
    <div
      className={`flex items-center justify-between gap-4 px-1 py-2.5 ${
        strong ? 'border-t border-border pt-3' : ''
      }`}
    >
      <span className={`text-sm ${strong ? 'font-semibold text-fg' : 'text-fg-muted'}`}>{label}</span>
      <span className={`font-display text-base tabular-nums ${strong ? 'font-bold' : 'font-semibold'} ${toneClass}`}>
        {formatMoney(value, symbol)}
      </span>
    </div>
  )
}

export default function ProfitLossPage() {
  const { t } = useTranslation('reports')
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['value']>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const query = useQuery({
    queryKey: ['report-profit-loss', preset, from, to],
    queryFn: async () =>
      (
        await reportsApi.profitLoss({
          preset: preset === 'custom' ? 'custom' : preset,
          from: preset === 'custom' ? from || undefined : undefined,
          to: preset === 'custom' ? to || undefined : undefined,
        })
      ).data as ProfitLossData,
    enabled: preset !== 'custom' || Boolean(from && to),
  })

  const data = query.data
  const revenue = toNumber(data?.revenue)
  const returns = toNumber(data?.returns)
  const netSales = toNumber(data?.netSales)
  const cogs = toNumber(data?.cogs)
  const grossProfit = toNumber(data?.grossProfit)
  const expenses = toNumber(data?.expenses)
  const netProfit = toNumber(data?.netProfit)

  return (
    <div>
      <PageHeader title={t('profitLoss.title')} description={t('profitLoss.description')} />
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
      ) : preset === 'custom' && !(from && to) ? (
        <EmptyState title={t('common.pickFromTo')} />
      ) : data ? (
        <div className="space-y-4">
          {data.range?.from && data.range?.to ? (
            <p className="text-sm text-fg-muted">
              {t('profitLoss.period', {
                from: formatDate(data.range.from),
                to: formatDate(data.range.to),
              })}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{t('profitLoss.netSales')}</p>
                <p className="mt-1 font-display text-xl font-bold">{formatMoney(netSales, symbol)}</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{t('profitLoss.grossProfit')}</p>
                <p
                  className={`mt-1 font-display text-xl font-bold ${
                    grossProfit >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-danger'
                  }`}
                >
                  {formatMoney(grossProfit, symbol)}
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{t('profitLoss.netProfit')}</p>
                <p
                  className={`mt-1 font-display text-xl font-bold ${
                    netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-danger'
                  }`}
                >
                  {formatMoney(netProfit, symbol)}
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardBody className="max-w-xl space-y-0">
              <p className="mb-2 text-sm font-semibold text-fg">{t('profitLoss.statement')}</p>
              <Line label={t('profitLoss.revenueSales')} value={revenue} symbol={symbol} />
              <Line label={t('profitLoss.salesReturns')} value={returns} symbol={symbol} tone="muted" />
              <Line label={t('profitLoss.netSales')} value={netSales} symbol={symbol} strong />
              <Line label={t('profitLoss.costOfGoods')} value={cogs} symbol={symbol} tone="muted" />
              <Line
                label={t('profitLoss.grossProfit')}
                value={grossProfit}
                symbol={symbol}
                tone={grossProfit >= 0 ? 'success' : 'danger'}
                strong
              />
              <Line label={t('profitLoss.operatingExpenses')} value={expenses} symbol={symbol} tone="muted" />
              <Line
                label={t('profitLoss.netProfit')}
                value={netProfit}
                symbol={symbol}
                tone={netProfit >= 0 ? 'success' : 'danger'}
                strong
              />
              {data.note ? (
                <p className="mt-3 text-xs text-fg-subtle">{data.note}</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      ) : (
        <EmptyState title={t('profitLoss.noData')} />
      )}
    </div>
  )
}
