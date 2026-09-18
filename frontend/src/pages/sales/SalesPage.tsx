import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { saleReturnsApi, salesApi } from '@/api/salesApi'
import { ReceiptPrint } from '@/components/receipt/ReceiptPrint'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import type { Sale } from '@/types'
import type { TFunction } from 'i18next'

function stockLabel(status: Sale['status'], t: TFunction) {
  if (status === 'PARTIALLY_RETURNED') return t('statusPartialReturn')
  if (status === 'RETURNED') return t('statusReturned')
  if (status === 'COMPLETED' || status === 'PARTIAL') return t('statusSold')
  return status
}

export default function SalesPage() {
  const { t } = useTranslation(['sales', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [selected, setSelected] = useState<Sale | null>(null)

  const list = useQuery({
    queryKey: ['sales', debounced],
    queryFn: async () => (await salesApi.list({ search: debounced || undefined, limit: 50 })).data,
  })

  const detail = useQuery({
    queryKey: ['sale', selected?.id],
    queryFn: async () => (await salesApi.get(selected!.id)).data,
    enabled: Boolean(selected?.id),
  })

  const detailReturns = useQuery({
    queryKey: ['sale-returns', selected?.id],
    queryFn: async () =>
      (await saleReturnsApi.list({ saleId: selected!.id, limit: 50 })).data,
    enabled: Boolean(selected?.id),
  })

  const sale = detail.data || selected

  const returnRows = useMemo(
    () =>
      (detailReturns.data ?? []).flatMap((ret) =>
        (ret.items ?? []).map((item, idx) => ({
          key: `${ret.id}-${item.productId}-${idx}`,
          returnNumber: ret.returnNumber,
          returnDate: ret.returnDate,
          productLabel:
            [item.product?.name, item.product?.size].filter(Boolean).join(' · ') || item.productId,
          quantity: toNumber(item.quantity),
          lineTotal: toNumber(item.lineTotal),
        })),
      ),
    [detailReturns.data],
  )

  return (
    <div>
      <ReceiptPrint sale={detail.data || null} />
      <PageHeader title={t('title')} description={t('description')} />
      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('searchPlaceholder')} />
      </div>
      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('emptyTitle')}
        columns={[
          { key: 'inv', header: t('columns.invoice'), render: (r) => r.invoiceNumber },
          { key: 'date', header: t('columns.date'), render: (r) => formatDateTime(r.saleDate) },
          {
            key: 'customer',
            header: t('columns.customer'),
            render: (r) => r.customer?.name || t('common:walkIn'),
          },
          {
            key: 'total',
            header: t('columns.netTotal'),
            render: (r) => formatMoney(r.netTotal ?? r.grandTotal, symbol),
          },
          {
            key: 'status',
            header: t('columns.status'),
            render: (r) => (
              <Badge
                tone={
                  r.status === 'PARTIALLY_RETURNED' || r.status === 'RETURNED'
                    ? 'warning'
                    : 'success'
                }
              >
                {stockLabel(r.status, t)}
              </Badge>
            ),
          },
          {
            key: 'pay',
            header: t('columns.payment'),
            render: (r) => <Badge tone="info">{r.paymentMethod}</Badge>,
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                  {t('common:view')}
                </Button>
                {r.status !== 'RETURNED' ? (
                  <Link to={`/sales-returns?saleId=${r.id}`}>
                    <Button size="sm" variant="ghost">
                      {t('common:return')}
                    </Button>
                  </Link>
                ) : null}
              </div>
            ),
          },
        ]}
      />
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={sale?.invoiceNumber || t('saleFallback')}
        size="xl"
      >
        {sale ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-fg-muted">
                {sale.customer?.name || t('common:walkIn')} · {formatDateTime(sale.saleDate)}
              </span>
              <Badge
                tone={
                  sale.status === 'PARTIALLY_RETURNED' || sale.status === 'RETURNED'
                    ? 'warning'
                    : 'success'
                }
              >
                {stockLabel(sale.status, t)}
              </Badge>
              <Badge tone="info">{sale.paymentMethod}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('invoiceTotal')}</p>
                <p className="font-semibold">{formatMoney(sale.grandTotal, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('returned')}</p>
                <p className="font-semibold">{formatMoney(sale.returnedAmount ?? 0, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('netTotal')}</p>
                <p className="font-semibold">
                  {formatMoney(sale.netTotal ?? sale.grandTotal, symbol)}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('paid')}</p>
                <p className="font-semibold">{formatMoney(sale.paidAmount, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('due')}</p>
                <p className="font-semibold">{formatMoney(sale.remainingAmount, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('refundDueToCustomer')}</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(sale.recoverable ?? 0, symbol)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-fg">{t('soldItems')}</p>
              <DataTable
                rows={sale.items ?? []}
                rowKey={(r) => r.id || r.productId}
                columns={[
                  {
                    key: 'p',
                    header: t('common:product'),
                    render: (r) =>
                      [r.product?.name, r.product?.size].filter(Boolean).join(' · ') ||
                      r.productId,
                  },
                  { key: 'q', header: t('common:qty'), render: (r) => toNumber(r.quantity) },
                  {
                    key: 'up',
                    header: t('common:unitPrice'),
                    render: (r) => formatMoney(r.unitPrice, symbol),
                  },
                  {
                    key: 't',
                    header: t('common:lineTotal'),
                    render: (r) => formatMoney(r.lineTotal, symbol),
                  },
                ]}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-fg">{t('returns')}</p>
              {detailReturns.isLoading ? (
                <p className="text-fg-muted">{t('common:loading')}</p>
              ) : returnRows.length ? (
                <DataTable
                  rows={returnRows}
                  rowKey={(r) => r.key}
                  columns={[
                    { key: 'rn', header: `${t('common:return')} #`, render: (r) => r.returnNumber },
                    { key: 'd', header: t('common:date'), render: (r) => formatDate(r.returnDate) },
                    { key: 'p', header: t('common:product'), render: (r) => r.productLabel },
                    { key: 'q', header: t('common:qty'), render: (r) => r.quantity },
                    {
                      key: 't',
                      header: t('common:amount'),
                      render: (r) => formatMoney(r.lineTotal, symbol),
                    },
                  ]}
                />
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-fg-muted">
                  {t('noReturnsAgainstSale')}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {sale.status !== 'RETURNED' ? (
                <Link to={`/sales-returns?saleId=${sale.id}`}>
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    {t('returnItems')}
                  </Button>
                </Link>
              ) : null}
              <Button onClick={() => window.print()}>{t('printReceipt')}</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
