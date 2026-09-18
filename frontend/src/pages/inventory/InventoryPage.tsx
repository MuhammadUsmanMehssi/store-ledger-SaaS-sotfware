import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { inventoryApi } from '@/api/inventoryApi'
import { productsApi } from '@/api/productsApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDateTime } from '@/utils/formatDate'
import { toNumber } from '@/utils/formatMoney'

export default function InventoryPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'stock' | 'movements'>('stock')

  const stock = useQuery({
    queryKey: ['inventory-stock', debounced],
    queryFn: async () => (await inventoryApi.stock({ search: debounced || undefined, limit: 100 })).data,
  })

  const movements = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: async () => (await inventoryApi.movements({ limit: 50 })).data,
    enabled: tab === 'movements',
  })

  const products = useQuery({
    queryKey: ['products-for-adjust'],
    queryFn: async () => (await productsApi.list({ limit: 100 })).data,
    enabled: adjustOpen,
  })

  const adjust = useMutation({
    mutationFn: async () => {
      if (!reason.trim()) throw new Error(t('reasonRequired'))
      return inventoryApi.adjust({
        productId,
        quantity: Number(quantity),
        reason: reason.trim(),
      })
    },
    onSuccess: () => {
      toast.success(t('stockAdjusted'))
      setAdjustOpen(false)
      setQuantity('0')
      setReason('')
      void qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      void qc.invalidateQueries({ queryKey: ['inventory-movements'] })
      void qc.invalidateQueries({ queryKey: ['inventory-adjustments'] })
    },
    onError: (e) =>
      toast.error(e instanceof ApiError || e instanceof Error ? e.message : t('adjustmentFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<Button onClick={() => setAdjustOpen(true)}>{t('adjustStock')}</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={tab === 'stock' ? 'primary' : 'outline'} onClick={() => setTab('stock')}>
          {t('stockTab')}
        </Button>
        <Button
          size="sm"
          variant={tab === 'movements' ? 'primary' : 'outline'}
          onClick={() => setTab('movements')}
        >
          {t('movementsTab')}
        </Button>
        {tab === 'stock' ? (
          <div className="ml-auto w-full max-w-sm sm:w-72">
            <SearchInput value={search} onChange={setSearch} placeholder={t('searchProducts')} />
          </div>
        ) : null}
      </div>

      {tab === 'stock' ? (
        <DataTable
          loading={stock.isLoading}
          rows={stock.data ?? []}
          rowKey={(r) => r.id}
          emptyTitle={t('noStockRecords')}
          columns={[
            { key: 'name', header: t('columns.product'), render: (r) => r.name },
            { key: 'sku', header: t('columns.sku'), render: (r) => r.sku || t('common:dash') },
            {
              key: 'stock',
              header: t('columns.current'),
              render: (r) => {
                const s = toNumber(r.currentStock)
                const m = toNumber(r.minimumStock)
                return <Badge tone={s <= m ? 'warning' : 'success'}>{s}</Badge>
              },
            },
            { key: 'min', header: t('columns.minimum'), render: (r) => toNumber(r.minimumStock) },
          ]}
        />
      ) : (
        <DataTable
          loading={movements.isLoading}
          rows={movements.data ?? []}
          rowKey={(r) => r.id}
          emptyTitle={t('noMovementsYet')}
          columns={[
            { key: 'date', header: t('columns.date'), render: (r) => formatDateTime(r.createdAt) },
            { key: 'product', header: t('columns.product'), render: (r) => r.product?.name || r.productId },
            { key: 'type', header: t('columns.type'), render: (r) => <Badge>{r.type}</Badge> },
            { key: 'qty', header: t('columns.qty'), render: (r) => toNumber(r.quantity) },
            { key: 'bal', header: t('columns.balance'), render: (r) => toNumber(r.balanceAfter) },
            { key: 'reason', header: t('columns.reason'), render: (r) => r.reason || t('common:dash') },
          ]}
        />
      )}

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title={t('stockAdjustment')}>
        <div className="space-y-3">
          <Select
            label={t('common:product')}
            options={[
              { label: t('selectProduct'), value: '' },
              ...(products.data ?? []).map((p) => ({
                label: t('productWithStock', { name: p.name, stock: toNumber(p.currentStock) }),
                value: p.id,
              })),
            ]}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <Input
            label={t('quantityAddRemove')}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label={t('reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              loading={adjust.isPending}
              disabled={!productId || !reason.trim() || Number(quantity) === 0}
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
