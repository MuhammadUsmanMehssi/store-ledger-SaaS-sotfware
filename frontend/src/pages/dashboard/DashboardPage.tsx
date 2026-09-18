import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Boxes,
  Truck,
  Banknote,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dashboardApi } from '@/api/dashboardApi'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { StatCard } from '@/components/ui/StatCard'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'
import type { DateRangeParams } from '@/types'

const PRESET_VALUES: Array<NonNullable<DateRangeParams['preset']>> = [
  'today',
  'yesterday',
  'week',
  'month',
  'last_month',
]

export default function DashboardPage() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const [preset, setPreset] = useState<DateRangeParams['preset']>('today')

  const presetLabel = (value: string | undefined) => {
    switch (value) {
      case 'today':
        return t('common:today')
      case 'yesterday':
        return t('common:yesterday')
      case 'week':
        return t('common:thisWeek')
      case 'month':
        return t('common:thisMonth')
      case 'last_month':
        return t('common:lastMonth')
      default:
        return value ?? ''
    }
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', preset],
    queryFn: async () => (await dashboardApi.stats({ preset })).data,
  })

  if (isLoading) return <LoadingState label={t('loading')} />
  if (isError || !data) {
    return (
      <EmptyState
        title={t('loadErrorTitle')}
        description={t('loadErrorDescription')}
        actionLabel={t('common:retry')}
        onAction={() => void refetch()}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {PRESET_VALUES.map((value) => (
              <Button
                key={value}
                size="sm"
                variant={preset === value ? 'primary' : 'outline'}
                onClick={() => setPreset(value)}
              >
                {presetLabel(value)}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('todaysSales')}
          value={formatMoney(data.sales.total, symbol)}
          hint={t('invoicesCount', { count: data.sales.count })}
          icon={ShoppingCart}
        />
        <StatCard label={t('profit')} value={formatMoney(data.sales.profit, symbol)} icon={TrendingUp} tone="success" />
        <StatCard label={t('expenses')} value={formatMoney(data.expenses.total, symbol)} icon={Wallet} tone="danger" />
        <StatCard label={t('cashInHand')} value={formatMoney(data.cashInHand ?? 0, symbol)} icon={Banknote} tone="accent" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('purchases')}
          value={formatMoney(data.purchases.total, symbol)}
          hint={t('ordersCount', { count: data.purchases.count })}
          icon={Boxes}
        />
        <StatCard label={t('products')} value={String(data.inventory.productCount)} icon={Package} />
        <StatCard label={t('lowStock')} value={String(data.inventory.lowStockCount)} icon={AlertTriangle} tone="warning" />
        <StatCard label={t('customers')} value={String(data.parties.customers)} icon={Users} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <h2 className="font-display text-sm font-semibold">{t('salesAndProfit')}</h2>
          </CardHeader>
          <CardBody className="h-64">
            {(data.chart?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatMoney(Number(v ?? 0), symbol)} />
                  <Area type="monotone" dataKey="sales" stroke="#0F766E" fill="url(#salesFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="profit" stroke="#D97706" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title={t('noChartData')} description={t('noChartDataDescription')} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-display text-sm font-semibold">{t('topSellingProducts')}</h2>
          </CardHeader>
          <CardBody>
            {(data.topProducts?.length ?? 0) > 0 ? (
              <ul className="space-y-2.5">
                {data.topProducts!.map((p) => (
                  <li key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-xs text-fg-muted">{t('qtyLabel', { qty: p.qty })}</p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatMoney(p.revenue, symbol)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t('noSalesYet')} description={t('noSalesYetDescription')} />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-sm font-semibold">{t('recentSales')}</h2>
          </CardHeader>
          <CardBody>
            {(data.recentSales?.length ?? 0) > 0 ? (
              <ul className="divide-y divide-border">
                {data.recentSales!.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{s.invoiceNumber}</p>
                      <p className="text-xs text-fg-muted">
                        {s.customerName} · {formatDate(s.saleDate)}
                      </p>
                    </div>
                    <span className="font-semibold">{formatMoney(s.grandTotal, symbol)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t('noRecentSales')} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-sm font-semibold">{t('lowStock')}</h2>
          </CardHeader>
          <CardBody>
            {(data.lowStockProducts?.length ?? 0) > 0 ? (
              <ul className="divide-y divide-border">
                {data.lowStockProducts!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-fg-muted">{t('minStock', { min: p.minimumStock })}</p>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{p.currentStock}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-2 text-sm text-fg-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                {t('allAboveMinimum')}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        {t('showingRange', {
          preset: presetLabel(data.range.preset),
          from: formatDate(data.range.from),
          to: formatDate(data.range.to),
        })}
      </p>
    </div>
  )
}
