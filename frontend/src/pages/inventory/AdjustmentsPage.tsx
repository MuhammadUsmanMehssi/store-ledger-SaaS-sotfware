import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { inventoryApi } from '@/api/inventoryApi'
import { productsApi } from '@/api/productsApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/formatDate'
import { toNumber } from '@/utils/formatMoney'

export default function AdjustmentsPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const toast = useToast()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const adjustments = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: async () =>
      (await inventoryApi.movements({ type: 'ADJUSTMENT', limit: 100 })).data,
  })

  const products = useQuery({
    queryKey: ['products-for-adjust'],
    queryFn: async () => (await productsApi.list({ limit: 100, isActive: true })).data,
  })

  const selectedProduct = useMemo(
    () => (products.data ?? []).find((p) => p.id === productId),
    [products.data, productId],
  )

  const systemStock = selectedProduct ? toNumber(selectedProduct.currentStock) : null
  const delta = Number(quantity)
  const projected =
    systemStock != null && Number.isFinite(delta) && quantity !== ''
      ? systemStock + delta
      : null

  const resetForm = () => {
    setProductId('')
    setQuantity('')
    setReason('')
    setNotes('')
  }

  const adjust = useMutation({
    mutationFn: async () => {
      const qty = Number(quantity)
      if (!productId) throw new Error(t('selectAProduct'))
      if (!Number.isFinite(qty) || qty === 0) throw new Error(t('enterNonZeroQuantity'))
      if (!reason.trim()) throw new Error(t('reasonRequired'))
      return inventoryApi.adjust({
        productId,
        quantity: qty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })
    },
    onSuccess: (res) => {
      const stock = (res.data as { currentStock?: number })?.currentStock
      toast.success(
        stock != null ? t('stockUpdatedBalance', { stock }) : t('stockAdjusted'),
      )
      setOpen(false)
      resetForm()
      void qc.invalidateQueries({ queryKey: ['inventory-adjustments'] })
      void qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      void qc.invalidateQueries({ queryKey: ['inventory-movements'] })
      void qc.invalidateQueries({ queryKey: ['products-for-adjust'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) =>
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : t('adjustmentFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('adjustmentsTitle')}
        description={t('adjustmentsDescription')}
        actions={<Button onClick={() => setOpen(true)}>{t('newAdjustment')}</Button>}
      />

      <Card className="mb-4">
        <CardBody className="text-sm text-fg-muted">{t('adjustmentsHelp')}</CardBody>
      </Card>

      <DataTable
        loading={adjustments.isLoading}
        rows={adjustments.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('adjustmentsEmptyTitle')}
        emptyDescription={t('adjustmentsEmptyDescription')}
        emptyActionLabel={t('newAdjustment')}
        onEmptyAction={() => setOpen(true)}
        columns={[
          {
            key: 'date',
            header: t('adjustmentColumns.date'),
            render: (r) => formatDateTime(r.createdAt),
          },
          {
            key: 'product',
            header: t('adjustmentColumns.product'),
            render: (r) => r.product?.name || r.productId,
          },
          {
            key: 'qty',
            header: t('adjustmentColumns.adjustment'),
            render: (r) => {
              const q = toNumber(r.quantity)
              return (
                <Badge tone={q < 0 ? 'danger' : 'success'}>
                  {q > 0 ? `+${q}` : q}
                </Badge>
              )
            },
          },
          {
            key: 'bal',
            header: t('adjustmentColumns.balanceAfter'),
            render: (r) => toNumber(r.balanceAfter),
          },
          {
            key: 'reason',
            header: t('adjustmentColumns.reason'),
            render: (r) => r.reason || t('common:dash'),
          },
        ]}
      />

      {adjustments.isError ? (
        <div className="mt-4">
          <EmptyState
            title={t('adjustmentsLoadError')}
            actionLabel={t('common:retry')}
            onAction={() => void adjustments.refetch()}
          />
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          resetForm()
        }}
        title={t('newAdjustmentModal')}
      >
        <div className="space-y-3">
          <Select
            label={t('common:product')}
            options={[
              { label: t('selectProduct'), value: '' },
              ...(products.data ?? []).map((p) => ({
                label: t('productWithSystemStock', {
                  name: p.name,
                  stock: toNumber(p.currentStock),
                }),
                value: p.id,
              })),
            ]}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />

          {systemStock != null ? (
            <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-fg-muted">{t('systemStock')}</span>
                <span className="font-semibold">{systemStock}</span>
              </div>
              {projected != null ? (
                <div className="mt-1 flex justify-between gap-2">
                  <span className="text-fg-muted">{t('afterAdjustment')}</span>
                  <span className="font-semibold">{projected}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <Input
            label={t('quantityAddRemove')}
            type="number"
            placeholder={t('quantityPlaceholder')}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label={t('reason')}
            placeholder={t('reasonPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <Input
            label={t('common:notesOptional')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
            >
              {t('common:cancel')}
            </Button>
            <Button
              loading={adjust.isPending}
              disabled={!productId || !reason.trim() || !quantity || Number(quantity) === 0}
              onClick={() => adjust.mutate()}
            >
              {t('saveAdjustment')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
