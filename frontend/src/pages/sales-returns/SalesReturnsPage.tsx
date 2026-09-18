import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { saleReturnsApi, salesApi } from '@/api/salesApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import type { PaymentMethod } from '@/types'

export default function SalesReturnsPage() {
  const { t } = useTranslation(['sales', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(Boolean(params.get('saleId')))
  const [saleId, setSaleId] = useState(params.get('saleId') || '')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH')

  const list = useQuery({
    queryKey: ['sale-returns'],
    queryFn: async () => (await saleReturnsApi.list({ limit: 50 })).data,
  })
  const sales = useQuery({
    queryKey: ['sales-for-return'],
    queryFn: async () => (await salesApi.list({ limit: 100 })).data,
  })
  const sale = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: async () => (await salesApi.get(saleId)).data,
    enabled: Boolean(saleId),
  })

  const items = useMemo(() => sale.data?.items ?? [], [sale.data])

  const create = useMutation({
    mutationFn: async () => {
      const payloadItems = items
        .map((item) => {
          const available = toNumber(item.quantity) - toNumber(item.returnedQty ?? 0)
          const qty = Math.min(qtys[item.productId] || 0, available)
          return { item, qty }
        })
        .filter(({ qty }) => qty > 0)
        .map(({ item, qty }) => ({
          productId: item.productId,
          quantity: qty,
          unitPrice: toNumber(item.unitPrice),
        }))
      if (!payloadItems.length) throw new ApiError(t('selectQuantities'), 400)
      return saleReturnsApi.create({ saleId, refundMethod, items: payloadItems })
    },
    onSuccess: () => {
      toast.success(t('returnCreated'), t('returnCreatedDetail'))
      setOpen(false)
      setQtys({})
      void qc.invalidateQueries({ queryKey: ['sale-returns'] })
      void qc.invalidateQueries({ queryKey: ['sales'] })
      void qc.invalidateQueries({ queryKey: ['sale'] })
      void qc.invalidateQueries({ queryKey: ['sale-detail'] })
      void qc.invalidateQueries({ queryKey: ['sales-for-return'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['products-mini'] })
      void qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      void qc.invalidateQueries({ queryKey: ['report-inventory'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['customer-ledger'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('returnFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('returnsTitle')}
        description={t('returnsDescription')}
        actions={<Button onClick={() => setOpen(true)}>{t('newReturn')}</Button>}
      />
      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('returnsEmptyTitle')}
        columns={[
          { key: 'num', header: `${t('common:return')} #`, render: (r) => r.returnNumber },
          { key: 'date', header: t('common:date'), render: (r) => formatDate(r.returnDate) },
          {
            key: 'sale',
            header: t('saleFallback'),
            render: (r) => r.sale?.invoiceNumber || r.saleId,
          },
          { key: 'total', header: t('common:total'), render: (r) => formatMoney(r.grandTotal, symbol) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title={t('createReturnTitle')} size="lg">
        <div className="space-y-3">
          <Select
            label={t('saleFallback')}
            value={saleId}
            onChange={(e) => {
              setSaleId(e.target.value)
              setQtys({})
            }}
            options={[
              { label: t('selectSale'), value: '' },
              ...(sales.data ?? [])
                .filter((s) => s.status !== 'RETURNED')
                .map((s) => ({
                  label: `${s.invoiceNumber} · ${formatMoney(s.netTotal ?? s.grandTotal, symbol)}`,
                  value: s.id,
                })),
            ]}
          />
          <Select
            label={t('refundMethod')}
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
            options={[
              { label: t('common:cash'), value: 'CASH' },
              { label: t('common:card'), value: 'CARD' },
              { label: t('common:online'), value: 'ONLINE' },
              { label: t('common:credit'), value: 'CREDIT' },
            ]}
          />
          {items.map((item) => {
            const sold = toNumber(item.quantity)
            const already = toNumber(item.returnedQty ?? 0)
            const available = Math.max(0, sold - already)
            const label =
              [item.product?.name, item.product?.size].filter(Boolean).join(' · ') || item.productId
            return (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-fg-subtle">
                    {t('soldMeta', { sold })}
                    {already > 0 ? t('alreadyReturned', { returned: already }) : ''}
                    {t('availableMeta', { available })}
                  </p>
                </div>
                <Input
                  className="w-28"
                  type="number"
                  min={0}
                  max={available}
                  disabled={available <= 0}
                  value={qtys[item.productId] || 0}
                  onChange={(e) => {
                    const next = Math.min(Number(e.target.value) || 0, available)
                    setQtys((prev) => ({ ...prev, [item.productId]: next }))
                  }}
                />
              </div>
            )
          })}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button loading={create.isPending} disabled={!saleId} onClick={() => create.mutate()}>
              {t('submitReturn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
