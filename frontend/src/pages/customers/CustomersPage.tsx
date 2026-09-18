import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { customersApi } from '@/api/customersApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import type { AccountTransaction, Customer, PaymentMethod } from '@/types'
import type { TFunction } from 'i18next'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  openingBalance: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof schema>

function productLabel(
  t: TFunction,
  product?: {
    name: string
    flavor?: string | null
    size?: string | null
  } | null,
) {
  if (!product) return t('productFallback')
  return [product.name, product.flavor, product.size].filter(Boolean).join(' · ')
}

function txnTypeLabel(type: string, t: TFunction) {
  switch (type) {
    case 'SALE':
      return t('txnSaleUdhaar')
    case 'PAYMENT':
      return t('txnKhataPayment')
    case 'OPENING':
      return t('txnOpening')
    case 'SALE_RETURN':
      return t('txnSaleReturn')
    default:
      return type
  }
}

function paymentMethodLabel(method: string | null | undefined, t: TFunction) {
  switch (method) {
    case 'CASH':
      return t('common:cash')
    case 'CARD':
      return t('common:card')
    case 'ONLINE':
      return t('common:online')
    case 'CREDIT':
      return t('common:credit')
    case 'MIXED':
      return t('common:mixed')
    default:
      return method || null
  }
}

function LedgerDetails({
  txn,
  symbol,
  t,
}: {
  txn: AccountTransaction
  symbol: string
  t: TFunction
}) {
  if (txn.type === 'SALE' && txn.sale) {
    return (
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="font-semibold text-fg">
            {t('invoiceLabel', { number: txn.sale.invoiceNumber })}
          </span>
          <span>{t('paidLabel', { amount: formatMoney(txn.sale.paidAmount, symbol) })}</span>
          <span>
            {t('remainingLabel', { amount: formatMoney(txn.sale.remainingAmount, symbol) })}
          </span>
          {paymentMethodLabel(txn.sale.paymentMethod || txn.paymentMethod, t) ? (
            <span>
              {t('methodLabel', {
                method: paymentMethodLabel(txn.sale.paymentMethod || txn.paymentMethod, t),
              })}
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-surface-2 text-xs text-fg-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">{t('ledgerCols.product')}</th>
                <th className="px-2 py-1.5 font-medium">{t('ledgerCols.qty')}</th>
                <th className="px-2 py-1.5 font-medium">{t('ledgerCols.rate')}</th>
                <th className="px-2 py-1.5 font-medium text-right">{t('ledgerCols.total')}</th>
              </tr>
            </thead>
            <tbody>
              {txn.sale.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <p className="font-medium text-fg">{productLabel(t, item.product)}</p>
                    <p className="text-xs text-fg-subtle">
                      {item.product?.sku || item.product?.barcode || t('common:dash')}
                    </p>
                  </td>
                  <td className="px-2 py-1.5">{toNumber(item.quantity)}</td>
                  <td className="px-2 py-1.5">{formatMoney(item.unitPrice, symbol)}</td>
                  <td className="px-2 py-1.5 text-right font-medium">
                    {formatMoney(item.lineTotal, symbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (txn.type === 'PAYMENT') {
    const method = paymentMethodLabel(txn.paymentMethod, t)
    return (
      <div className="mt-2 space-y-1 text-xs text-fg-muted">
        {method ? (
          <p>
            {t('methodColon')} <span className="font-semibold text-fg">{method}</span>
          </p>
        ) : null}
        {txn.sale ? (
          <p>
            {t('againstInvoice')}{' '}
            <span className="font-semibold text-fg">{txn.sale.invoiceNumber}</span>
          </p>
        ) : null}
        {txn.notes ? <p>{txn.notes}</p> : null}
      </div>
    )
  }

  if (txn.saleReturn) {
    return (
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <p className="text-xs text-fg-muted">
          {t('returnLabel')}{' '}
          <span className="font-semibold text-fg">{txn.saleReturn.returnNumber}</span>
        </p>
        <ul className="space-y-1 text-sm">
          {txn.saleReturn.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {productLabel(t, item.product)} × {toNumber(item.quantity)}
              </span>
              <span className="font-medium">{formatMoney(item.lineTotal, symbol)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (txn.notes) {
    return <p className="mt-2 text-xs text-fg-muted">{txn.notes}</p>
  }

  return null
}

export default function CustomersPage() {
  const { t } = useTranslation(['customers', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [payFor, setPayFor] = useState<Customer | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [ledgerFor, setLedgerFor] = useState<Customer | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const list = useQuery({
    queryKey: ['customers', debounced],
    queryFn: async () => (await customersApi.list({ search: debounced || undefined, limit: 50 })).data,
  })

  const ledger = useQuery({
    queryKey: ['customer-ledger', ledgerFor?.id],
    queryFn: async () => (await customersApi.ledger(ledgerFor!.id, { limit: 50 })).data,
    enabled: Boolean(ledgerFor),
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = { ...values, email: values.email || undefined }
      return editing ? customersApi.update(editing.id, body) : customersApi.create(body)
    },
    onSuccess: () => {
      toast.success(editing ? t('updated') : t('created'))
      setOpen(false)
      setEditing(null)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const pay = useMutation({
    mutationFn: async () =>
      customersApi.payment(payFor!.id, { amount: Number(amount), paymentMethod: method }),
    onSuccess: () => {
      toast.success(t('paymentRecorded'))
      setPayFor(null)
      setAmount('')
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['customer-ledger'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:paymentFailed')),
  })

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
            header: t('columns.khataUdhaar'),
            render: (r) => {
              const bal = toNumber(r.currentBalance)
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{formatMoney(bal, symbol)}</span>
                  {bal > 0 ? <Badge tone="warning">{t('outstanding')}</Badge> : null}
                </div>
              )
            },
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setPayFor(r)}>
                  {t('receiveKhataPayment')}
                </Button>
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
        title={t('receivePaymentTitle', { name: payFor?.name || '' })}
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('currentKhata')}{' '}
            <span className="font-semibold text-fg">
              {formatMoney(payFor?.currentBalance, symbol)}
            </span>
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
              {t('recordKhataPayment')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(ledgerFor)}
        onClose={() => setLedgerFor(null)}
        title={t('historyTitle', { name: ledgerFor?.name || '' })}
        description={t('historyDescription')}
        size="xl"
      >
        {ledger.isLoading ? (
          <LoadingState className="min-h-[12rem]" />
        ) : !(ledger.data ?? []).length ? (
          <EmptyState title={t('noTransactions')} />
        ) : (
          <div className="space-y-3">
            {(ledger.data ?? []).map((txn, idx) => (
              <div
                key={txn.id}
                className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-fg-muted">#{idx + 1}</span>
                      <Badge
                        tone={
                          txn.type === 'SALE'
                            ? 'warning'
                            : txn.type === 'PAYMENT'
                              ? 'success'
                              : 'default'
                        }
                      >
                        {txnTypeLabel(txn.type, t)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{formatDateTime(txn.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-fg">
                      {formatMoney(txn.amount, symbol)}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {t('balanceAfter', { amount: formatMoney(txn.balanceAfter, symbol) })}
                    </p>
                  </div>
                </div>
                <LedgerDetails txn={txn} symbol={symbol} t={t} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
