import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { purchaseReturnsApi, purchasesApi } from '@/api/purchasesApi'
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

export default function PurchaseReturnsPage() {
  const { t } = useTranslation(['purchases', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(Boolean(params.get('purchaseId')))
  const [purchaseId, setPurchaseId] = useState(params.get('purchaseId') || '')
  const [qtys, setQtys] = useState<Record<string, number>>({})

  const list = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => (await purchaseReturnsApi.list({ limit: 50 })).data,
  })
  const purchases = useQuery({
    queryKey: ['purchases-for-return'],
    queryFn: async () => (await purchasesApi.list({ limit: 100, status: 'COMPLETED' })).data,
  })
  const purchase = useQuery({
    queryKey: ['purchase-detail', purchaseId],
    queryFn: async () => (await purchasesApi.get(purchaseId)).data,
    enabled: Boolean(purchaseId),
  })

  const items = useMemo(() => purchase.data?.items ?? [], [purchase.data])

  const create = useMutation({
    mutationFn: async () => {
      const payloadItems = items
        .filter((item) => (qtys[item.productId] || 0) > 0)
        .map((item) => ({
          productId: item.productId,
          quantity: qtys[item.productId],
          unitPrice: toNumber(item.unitPrice),
        }))
      if (!payloadItems.length) throw new ApiError(t('selectQuantities'), 400)
      return purchaseReturnsApi.create({ purchaseId, items: payloadItems })
    },
    onSuccess: () => {
      toast.success(t('returnCreated'))
      setOpen(false)
      setQtys({})
      void qc.invalidateQueries({ queryKey: ['purchase-returns'] })
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
            key: 'purchase',
            header: t('columns.invoice'),
            render: (r) => r.purchase?.invoiceNumber || r.purchaseId,
          },
          { key: 'total', header: t('common:total'), render: (r) => formatMoney(r.grandTotal, symbol) },
        ]}
      />
      <Modal open={open} onClose={() => setOpen(false)} title={t('createReturnTitle')} size="lg">
        <div className="space-y-3">
          <Select
            label={t('columns.invoice')}
            value={purchaseId}
            onChange={(e) => {
              setPurchaseId(e.target.value)
              setQtys({})
            }}
            options={[
              { label: t('selectPurchase'), value: '' },
              ...(purchases.data ?? []).map((p) => ({
                label: t('purchaseOption', {
                  invoice: p.invoiceNumber,
                  supplier: p.supplier?.name || t('common:supplier'),
                }),
                value: p.id,
              })),
            ]}
          />
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <div>
                <p className="font-medium">{item.product?.name || item.productId}</p>
                <p className="text-xs text-fg-subtle">
                  {t('purchasedQty', { qty: toNumber(item.quantity) })}
                </p>
              </div>
              <Input
                className="w-28"
                type="number"
                min={0}
                max={toNumber(item.quantity) - toNumber(item.returnedQty)}
                value={qtys[item.productId] || 0}
                onChange={(e) =>
                  setQtys((prev) => ({ ...prev, [item.productId]: Number(e.target.value) || 0 }))
                }
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button loading={create.isPending} disabled={!purchaseId} onClick={() => create.mutate()}>
              {t('submitReturn')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
