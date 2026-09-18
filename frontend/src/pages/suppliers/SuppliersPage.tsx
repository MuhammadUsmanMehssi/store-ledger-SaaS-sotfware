import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { suppliersApi } from '@/api/suppliersApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import type { AccountTransaction, PaymentMethod, Supplier } from '@/types'
import type { TFunction } from 'i18next'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof schema>

function txnLabel(txn: AccountTransaction, t: TFunction) {
  switch (txn.type) {
    case 'PURCHASE':
      return t('txnPurchase')
    case 'PURCHASE_RETURN':
      return t('txnPurchaseReturn')
    case 'PAYMENT':
      return t('txnPaymentToSupplier')
    case 'REFUND':
      return t('txnReceivedFromSupplier')
    case 'OPENING':
      return t('txnOpening')
    default:
      return txn.type
  }
}

export default function SuppliersPage() {
  const { t } = useTranslation(['suppliers', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [payFor, setPayFor] = useState<Supplier | null>(null)
  const [refundFor, setRefundFor] = useState<Supplier | null>(null)
  const [ledgerFor, setLedgerFor] = useState<Supplier | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const list = useQuery({
    queryKey: ['suppliers', debounced],
    queryFn: async () => (await suppliersApi.list({ search: debounced || undefined, limit: 50 })).data,
  })

  const ledger = useQuery({
    queryKey: ['supplier-ledger', ledgerFor?.id],
    queryFn: async () => (await suppliersApi.ledger(ledgerFor!.id, { limit: 50 })).data,
    enabled: Boolean(ledgerFor),
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = { ...values, email: values.email || undefined }
      return editing ? suppliersApi.update(editing.id, body) : suppliersApi.create(body)
    },
    onSuccess: () => {
      toast.success(editing ? t('updated') : t('created'))
      setOpen(false)
      setEditing(null)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const pay = useMutation({
    mutationFn: async () =>
      suppliersApi.payment(payFor!.id, { amount: Number(amount), paymentMethod: method }),
    onSuccess: () => {
      toast.success(t('paymentRecorded'))
      setPayFor(null)
      setAmount('')
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
      void qc.invalidateQueries({ queryKey: ['supplier-ledger'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:paymentFailed')),
  })

  const refund = useMutation({
    mutationFn: async () =>
      suppliersApi.refund(refundFor!.id, { amount: Number(amount), paymentMethod: method }),
    onSuccess: () => {
      toast.success(t('refundReceived'))
      setRefundFor(null)
      setAmount('')
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
      void qc.invalidateQueries({ queryKey: ['supplier-ledger'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('refundFailed')),
  })

  const openPay = (supplier: Supplier) => {
    setPayFor(supplier)
    setAmount('')
    setMethod('CASH')
  }

  const openRefund = (supplier: Supplier) => {
    const recoverable = Math.abs(Math.min(0, toNumber(supplier.currentBalance)))
    setRefundFor(supplier)
    setAmount(String(recoverable || ''))
    setMethod('CASH')
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              form.reset({ name: '', openingBalance: 0 })
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> {t('add')}
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} />
      </div>
      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('emptyTitle')}
        columns={[
          { key: 'name', header: t('columns.name'), render: (r) => r.name },
          { key: 'phone', header: t('columns.phone'), render: (r) => r.phone || t('common:dash') },
          {
            key: 'balance',
            header: t('columns.balance'),
            render: (r) => {
              const bal = toNumber(r.currentBalance)
              return (
                <span className={bal < 0 ? 'font-medium text-emerald-700 dark:text-emerald-300' : undefined}>
                  {formatMoney(r.currentBalance, symbol)}
                  {bal < 0 ? t('theyOweYou') : ''}
                </span>
              )
            },
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-1">
                {toNumber(r.currentBalance) > 0 ? (
                  <Button size="sm" variant="outline" onClick={() => openPay(r)}>
                    {t('common:pay')}
                  </Button>
                ) : null}
                {toNumber(r.currentBalance) < 0 ? (
                  <Button size="sm" onClick={() => openRefund(r)}>
                    {t('common:receive')}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setLedgerFor(r)}>
                  {t('common:history')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(r)
                    form.reset({
                      name: r.name,
                      phone: r.phone || '',
                      email: r.email || '',
                      address: r.address || '',
                    })
                    setOpen(true)
                  }}
                >
                  {t('common:edit')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('edit') : t('addModal')}>
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <Input
            label={t('common:name')}
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input label={t('common:phone')} {...form.register('phone')} />
          <Input label={t('common:email')} {...form.register('email')} />
          <Input label={t('common:address')} {...form.register('address')} />
          {!editing ? (
            <Input
              label={t('openingBalance')}
              type="number"
              {...form.register('openingBalance')}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t('common:save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={t('paymentTitle', { name: payFor?.name || '' })}
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('payable', { amount: formatMoney(payFor?.currentBalance, symbol) })}
          </p>
          <Input
            label={t('common:amount')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select
            label={t('common:method')}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={[
              { label: t('common:cash'), value: 'CASH' },
              { label: t('common:card'), value: 'CARD' },
              { label: t('common:online'), value: 'ONLINE' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayFor(null)}>
              {t('common:cancel')}
            </Button>
            <Button loading={pay.isPending} onClick={() => pay.mutate()}>
              {t('recordPayment')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(refundFor)}
        onClose={() => setRefundFor(null)}
        title={t('receiveTitle', { name: refundFor?.name || '' })}
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('recoverableFromSupplier')}{' '}
            {formatMoney(Math.abs(Math.min(0, toNumber(refundFor?.currentBalance))), symbol)}
          </p>
          <Input
            label={t('amountReceived')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select
            label={t('common:method')}
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            options={[
              { label: t('common:cash'), value: 'CASH' },
              { label: t('common:card'), value: 'CARD' },
              { label: t('common:online'), value: 'ONLINE' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRefundFor(null)}>
              {t('common:cancel')}
            </Button>
            <Button loading={refund.isPending} onClick={() => refund.mutate()}>
              {t('recordReceipt')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(ledgerFor)}
        onClose={() => setLedgerFor(null)}
        title={t('historyTitle', { name: ledgerFor?.name || '' })}
        size="lg"
      >
        {ledger.isLoading ? (
          <p className="text-sm text-fg-muted">{t('loading')}</p>
        ) : !(ledger.data ?? []).length ? (
          <EmptyState title={t('noTransactions')} />
        ) : (
          <div className="space-y-3">
            {(ledger.data ?? []).map((txn) => (
              <div key={txn.id} className="rounded-xl border border-border px-3 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-fg">{txnLabel(txn, t)}</p>
                    <p className="text-xs text-fg-muted">{formatDate(txn.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(txn.amount, symbol)}</p>
                    <Badge tone={txn.type === 'REFUND' ? 'success' : 'default'}>{txn.type}</Badge>
                  </div>
                </div>
                {txn.purchase ? (
                  <p className="mt-2 text-xs text-fg-muted">
                    {t('purchaseLabel')}{' '}
                    <span className="font-semibold text-fg">{txn.purchase.invoiceNumber}</span>
                  </p>
                ) : null}
                {txn.purchaseReturn ? (
                  <p className="mt-2 text-xs text-fg-muted">
                    {t('returnLabel')}{' '}
                    <span className="font-semibold text-fg">{txn.purchaseReturn.returnNumber}</span>
                    {txn.purchaseReturn.purchase?.invoiceNumber
                      ? ` · ${txn.purchaseReturn.purchase.invoiceNumber}`
                      : ''}
                  </p>
                ) : null}
                {txn.notes ? <p className="mt-1 text-xs text-fg-muted">{txn.notes}</p> : null}
                <p className="mt-1 text-xs text-fg-muted">
                  {t('balanceAfter', { amount: formatMoney(txn.balanceAfter, symbol) })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
