import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CreditCard,
  ImageIcon,
  Package,
  Pause,
  Play,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  Wifi,
  UserRound,
} from 'lucide-react'
import { brandsApi } from '@/api/brandsApi'
import { categoriesApi } from '@/api/categoriesApi'
import { customersApi } from '@/api/customersApi'
import { productsApi } from '@/api/productsApi'
import { saleReturnsApi, salesApi } from '@/api/salesApi'
import { ApiError } from '@/api/client'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ReceiptPrint } from '@/components/receipt/ReceiptPrint'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission } from '@/constants/roles'
import { normalizeEnabledModules } from '@/constants/modules'
import { cn } from '@/utils/cn'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import { mediaUrl } from '@/utils/mediaUrl'
import type { PaymentMethod, Product, Sale } from '@/types'

type CartLine = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  discount: number
  stock: number
}

const PAYMENT_METHOD_ICONS: Array<{ id: PaymentMethod; icon: typeof Wallet }> = [
  { id: 'CASH', icon: Wallet },
  { id: 'CARD', icon: CreditCard },
  { id: 'ONLINE', icon: Wifi },
  { id: 'CREDIT', icon: UserRound },
]

export default function PosPage() {
  const { t } = useTranslation(['pos', 'common'])
  const { tenant, user } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const canReturn = hasPermission(
    user?.storeRole,
    'sales_returns',
    normalizeEnabledModules(tenant?.enabledModules),
  )
  const toast = useToast()
  const qc = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 200)
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState('')
  const [cartDiscount, setCartDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [received, setReceived] = useState('')
  const [holdOpen, setHoldOpen] = useState(false)
  const [holdName, setHoldName] = useState('')
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnSaleId, setReturnSaleId] = useState('')
  const [returnInvoiceSearch, setReturnInvoiceSearch] = useState('')
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH')
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const [printTicket, setPrintTicket] = useState(0)
  const [mobilePane, setMobilePane] = useState<'catalog' | 'cart'>('catalog')

  const paymentLabel = (id: PaymentMethod) => {
    switch (id) {
      case 'CASH':
        return t('cash')
      case 'CARD':
        return t('card')
      case 'ONLINE':
        return t('online')
      case 'CREDIT':
        return t('credit')
    }
  }

  const productsQuery = useQuery({
    queryKey: ['pos-products', debounced, categoryId, brandId],
    queryFn: async () =>
      (
        await productsApi.list({
          search: debounced || undefined,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          isActive: true,
          limit: 60,
        })
      ).data,
  })

  const categoriesQuery = useQuery({
    queryKey: ['pos-categories'],
    queryFn: async () => (await categoriesApi.list({ limit: 50, isActive: true })).data,
  })

  const brandsQuery = useQuery({
    queryKey: ['pos-brands'],
    queryFn: async () => (await brandsApi.list({ limit: 100, isActive: true })).data,
  })

  const customersQuery = useQuery({
    queryKey: ['pos-customers'],
    queryFn: async () => (await customersApi.list({ limit: 100, isActive: true })).data,
  })

  const heldQuery = useQuery({
    queryKey: ['held-sales'],
    queryFn: async () => (await salesApi.listHeld()).data,
    enabled: holdOpen,
  })

  const returnSalesQuery = useQuery({
    queryKey: ['pos-return-sales', returnInvoiceSearch],
    queryFn: async () =>
      (
        await salesApi.list({
          search: returnInvoiceSearch.trim() || undefined,
          limit: 30,
        })
      ).data,
    enabled: returnOpen,
  })

  const returnSaleQuery = useQuery({
    queryKey: ['pos-return-sale', returnSaleId],
    queryFn: async () => (await salesApi.get(returnSaleId)).data,
    enabled: returnOpen && Boolean(returnSaleId),
  })

  const returnItems = useMemo(() => returnSaleQuery.data?.items ?? [], [returnSaleQuery.data])

  const selectedCustomer = useMemo(
    () => (customersQuery.data ?? []).find((c) => c.id === customerId) ?? null,
    [customersQuery.data, customerId],
  )
  const customerBalance = toNumber(selectedCustomer?.currentBalance)

  const categoryProductsForBrands = useQuery({
    queryKey: ['pos-products-brands', categoryId],
    queryFn: async () =>
      (
        await productsApi.list({
          categoryId: categoryId || undefined,
          isActive: true,
          limit: 100,
        })
      ).data,
    enabled: Boolean(categoryId),
  })

  const visibleBrandChips = useMemo(() => {
    const allBrands = brandsQuery.data ?? []
    if (!categoryId) return allBrands
    const products = categoryProductsForBrands.data ?? []
    const ids = new Set(
      products
        .map((p) => p.brandId || p.brandRef?.id)
        .filter((id): id is string => Boolean(id)),
    )
    return allBrands.filter((b) => ids.has(b.id))
  }, [brandsQuery.data, categoryId, categoryProductsForBrands.data])

  const addProduct = useCallback((product: Product) => {
    const stock = toNumber(product.currentStock)
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        if (!tenant?.allowNegativeStock && existing.quantity + 1 > stock) {
          toast.error(t('insufficientStock'), t('availableStock', { stock }))
          return prev
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      if (!tenant?.allowNegativeStock && stock <= 0) {
        toast.error(t('outOfStock'), product.name)
        return prev
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: toNumber(product.salePrice),
          quantity: 1,
          discount: 0,
          stock,
        },
      ]
    })
  }, [tenant?.allowNegativeStock, toast, t])

  const tryBarcodeAdd = useCallback(
    async (code: string) => {
      try {
        const res = await productsApi.byBarcode(code)
        addProduct(res.data)
        setSearch('')
        return true
      } catch {
        return false
      }
    },
    [addProduct],
  )

  const onSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = search.trim()
    if (!value) return
    const matched = await tryBarcodeAdd(value)
    if (!matched) {
      const exact = (productsQuery.data ?? []).find(
        (p) =>
          p.barcode === value ||
          p.sku === value ||
          p.name.toLowerCase() === value.toLowerCase(),
      )
      if (exact) {
        addProduct(exact)
        setSearch('')
      }
    }
  }

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity - line.discount, 0),
    [cart],
  )
  const cartQty = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart])
  const grandTotal = Math.max(0, subtotal - cartDiscount)
  const receivedNum = toNumber(received)
  const change = paymentMethod === 'CASH' ? Math.max(0, receivedNum - grandTotal) : 0
  const projectedKhata = customerBalance + grandTotal

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l
        const next = { ...l, ...patch }
        if (!tenant?.allowNegativeStock && next.quantity > next.stock) {
          toast.error(t('insufficientStock'), t('availableStock', { stock: next.stock }))
          return l
        }
        return next
      }),
    )
  }

  const clearCart = () => {
    setCart([])
    setCartDiscount(0)
    setReceived('')
    setCustomerId('')
    setPaymentMethod('CASH')
  }

  const completeMutation = useMutation({
    mutationFn: async (ctx?: { isCredit: boolean; customerName?: string; projectedKhata?: number }) => {
      if (!cart.length) throw new ApiError(t('cartEmpty'), 400)
      if (paymentMethod === 'CREDIT' && !customerId) {
        throw new ApiError(t('selectCustomerForCredit'), 400)
      }
      const paidAmount =
        paymentMethod === 'CREDIT'
          ? 0
          : paymentMethod === 'CASH'
            ? receivedNum || grandTotal
            : grandTotal

      const sale = (
        await salesApi.create({
          customerId: customerId || null,
          discountAmount: cartDiscount,
          paidAmount,
          paymentMethod,
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
          })),
        })
      ).data
      return { sale, ctx }
    },
    onSuccess: ({ sale, ctx }) => {
      if (ctx?.isCredit && ctx.customerName) {
        toast.success(
          t('saleAddedToKhata'),
          t('khataNow', {
            invoice: sale.invoiceNumber,
            customer: ctx.customerName,
            balance: formatMoney(ctx.projectedKhata ?? 0, symbol),
          }),
        )
      } else {
        toast.success(t('saleCompleted'), sale.invoiceNumber)
      }
      setLastSale(sale)
      clearCart()
      setMobilePane('catalog')
      void qc.invalidateQueries({ queryKey: ['pos-products'] })
      void qc.invalidateQueries({ queryKey: ['pos-customers'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      setPrintTicket((n) => n + 1)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('saleFailed')),
  })

  useEffect(() => {
    if (!printTicket || !lastSale) return
    const id = window.requestAnimationFrame(() => {
      window.setTimeout(() => window.print(), 100)
    })
    return () => window.cancelAnimationFrame(id)
  }, [printTicket, lastSale])

  const holdMutation = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new ApiError(t('cartEmpty'), 400)
      return (
        await salesApi.hold({
          customerId: customerId || null,
          referenceName: holdName || undefined,
          discountAmount: cartDiscount,
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discount,
          })),
        })
      ).data
    },
    onSuccess: () => {
      toast.success(t('saleHeld'))
      clearCart()
      setHoldName('')
      void qc.invalidateQueries({ queryKey: ['held-sales'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('holdFailed')),
  })

  const openReturnModal = () => {
    setReturnSaleId(lastSale?.id || '')
    setReturnInvoiceSearch(lastSale?.invoiceNumber || '')
    setReturnQtys({})
    setRefundMethod(lastSale?.paymentMethod === 'CREDIT' ? 'CREDIT' : 'CASH')
    setReturnOpen(true)
  }

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!returnSaleId) throw new ApiError(t('selectSaleInvoice'), 400)
      const payloadItems = returnItems
        .map((item) => {
          const available = toNumber(item.quantity) - toNumber(item.returnedQty ?? 0)
          const qty = Math.min(returnQtys[item.productId] || 0, available)
          return { item, qty }
        })
        .filter(({ qty }) => qty > 0)
        .map(({ item, qty }) => ({
          productId: item.productId,
          quantity: qty,
          unitPrice: toNumber(item.unitPrice),
        }))
      if (!payloadItems.length) throw new ApiError(t('enterReturnQuantities'), 400)
      return saleReturnsApi.create({
        saleId: returnSaleId,
        refundMethod,
        items: payloadItems,
      })
    },
    onSuccess: (res) => {
      toast.success(t('returnRecorded'), res.data.returnNumber)
      setReturnOpen(false)
      setReturnQtys({})
      setReturnSaleId('')
      void qc.invalidateQueries({ queryKey: ['pos-products'] })
      void qc.invalidateQueries({ queryKey: ['pos-return-sales'] })
      void qc.invalidateQueries({ queryKey: ['pos-return-sale'] })
      void qc.invalidateQueries({ queryKey: ['sale-returns'] })
      void qc.invalidateQueries({ queryKey: ['sales'] })
      void qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['customers'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('returnFailed')),
  })

  const resumeHeld = async (id: string) => {
    try {
      const held = (await salesApi.getHeld(id)).data
      setCart(
        held.items.map((item) => ({
          productId: item.productId,
          name: item.product?.name || t('productFallback'),
          unitPrice: toNumber(item.unitPrice),
          quantity: toNumber(item.quantity),
          discount: toNumber(item.discount),
          stock: toNumber(item.product?.currentStock ?? 9999),
        })),
      )
      setCustomerId(held.customerId || '')
      setCartDiscount(toNumber(held.discountAmount))
      await salesApi.deleteHeld(id)
      setHoldOpen(false)
      toast.success(t('heldSaleResumed'))
      void qc.invalidateQueries({ queryKey: ['held-sales'] })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('couldNotResume'))
    }
  }

  return (
    <>
      <ReceiptPrint sale={lastSale} />

      <div className="no-print flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden lg:flex-row">
        <section
          className={cn(
            'min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-border lg:border-r',
            mobilePane === 'catalog' ? 'flex' : 'hidden',
            'lg:flex',
          )}
        >
          <div className="shrink-0 border-b border-border bg-surface px-2 py-1.5 md:px-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => void onSearchKeyDown(e)}
                  placeholder={t('searchPlaceholder')}
                  className="h-8 w-full rounded-lg border border-border bg-surface-2 pl-8 pr-2 text-sm outline-none ring-primary-700/20 focus:border-primary-600 focus:ring-2"
                />
              </div>
              <LanguageSwitcher className="hidden lg:inline-flex" />
              {canReturn ? (
                <Button variant="outline" size="sm" onClick={openReturnModal}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('return')}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setHoldOpen(true)}>
                <Play className="h-3.5 w-3.5" />
                {t('held')}
              </Button>
            </div>
            <div className="mt-1.5 flex max-w-full gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
              <button
                type="button"
                onClick={() => { setCategoryId(''); setBrandId('') }}
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold transition',
                  !categoryId
                    ? 'bg-primary-700 text-white'
                    : 'bg-surface-3 text-fg-muted hover:text-fg',
                )}
              >
                {t('all')}
              </button>
              {(categoriesQuery.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setCategoryId(c.id); setBrandId('') }}
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold transition',
                    categoryId === c.id
                      ? 'bg-primary-700 text-white'
                      : 'bg-surface-3 text-fg-muted hover:text-fg',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {(visibleBrandChips.length > 0 || brandId) ? (
              <div className="mt-1 flex max-w-full gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                <button
                  type="button"
                  onClick={() => setBrandId('')}
                  className={cn(
                    'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition',
                    !brandId
                      ? 'border-primary-600 bg-primary-700/10 text-primary-800 dark:text-primary-300'
                      : 'border-border text-fg-muted hover:text-fg',
                  )}
                >
                  {t('allBrands')}
                </button>
                {visibleBrandChips.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandId(b.id)}
                    className={cn(
                      'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition',
                      brandId === b.id
                        ? 'border-primary-600 bg-primary-700/10 text-primary-800 dark:text-primary-300'
                        : 'border-border text-fg-muted hover:text-fg',
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-surface-2/50 p-1.5 md:p-2">
            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : (productsQuery.data ?? []).length === 0 ? (
              <EmptyState title={t('noProductsFound')} description={t('noProductsFoundDescription')} />
            ) : (
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {(productsQuery.data ?? []).map((product) => {
                  const stock = toNumber(product.currentStock)
                  const img = mediaUrl(product.imageUrl)
                  const brandName = product.brand || product.brandRef?.name
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex min-w-0 items-stretch gap-1.5 overflow-hidden rounded-md border border-border bg-surface p-1 text-left shadow-sm transition hover:border-primary-600/40 active:scale-[0.99]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2 sm:h-12 sm:w-12">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-fg-subtle" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        {brandName ? (
                          <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                            {brandName}
                          </p>
                        ) : null}
                        <p className="line-clamp-1 text-[11px] font-semibold leading-tight text-fg">{product.name}</p>
                        {(product.flavor || product.size) ? (
                          <p className="truncate text-[9px] text-fg-subtle">
                            {[product.flavor, product.size].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="text-xs font-bold text-primary-800 dark:text-primary-300">
                            {formatMoney(product.salePrice, symbol)}
                          </span>
                          <span
                            className={cn(
                              'truncate text-[9px]',
                              stock <= toNumber(product.minimumStock)
                                ? 'font-semibold text-amber-700 dark:text-amber-300'
                                : 'text-fg-subtle',
                            )}
                          >
                            {t('stockLeft', { stock })}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <aside
          className={cn(
            'min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-surface lg:w-[18rem] lg:flex-none xl:w-[20rem]',
            mobilePane === 'cart' ? 'flex' : 'hidden',
            'lg:flex',
          )}
        >
          <div className="shrink-0 border-b border-border px-2.5 py-1.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">{t('cart')}</h2>
              <Button variant="ghost" size="sm" onClick={clearCart} disabled={!cart.length}>
                <Trash2 className="h-3.5 w-3.5" />
                {t('clear')}
              </Button>
            </div>
            <div className="mt-1">
              <Select
                options={[
                  { label: t('walkInCustomer'), value: '' },
                  ...(customersQuery.data ?? []).map((c) => {
                    const bal = toNumber(c.currentBalance)
                    return {
                      label: bal > 0
                        ? t('khataBalance', { name: c.name, balance: formatMoney(bal, symbol) })
                        : c.name,
                      value: c.id,
                    }
                  }),
                ]}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-1.5">
            {!cart.length ? (
              <p className="px-2 py-4 text-center text-xs text-fg-muted">
                {t('emptyCartHint')}
              </p>
            ) : (
              cart.map((line) => (
                <div key={line.productId} className="rounded-md border border-border bg-surface-2/70 p-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-fg">{line.name}</p>
                    <button
                      type="button"
                      className="shrink-0 text-fg-subtle hover:text-danger"
                      onClick={() => setCart((prev) => prev.filter((l) => l.productId !== line.productId))}
                      aria-label={t('remove')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1">
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(line.productId, { quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      aria-label={t('quantity')}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(line.productId, { unitPrice: Number(e.target.value) || 0 })
                      }
                      aria-label={t('price')}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={line.discount}
                      onChange={(e) =>
                        updateLine(line.productId, { discount: Number(e.target.value) || 0 })
                      }
                      aria-label={t('discount')}
                    />
                  </div>
                  <p className="mt-0.5 text-right text-[11px] font-semibold">
                    {formatMoney(line.unitPrice * line.quantity - line.discount, symbol)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-border bg-surface px-2.5 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-fg-muted">{t('subtotal')}</span>
              <span className="font-medium">{formatMoney(subtotal, symbol)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-xs text-fg-muted">{t('discount')}</span>
              <Input
                type="number"
                step="0.01"
                value={cartDiscount}
                onChange={(e) => setCartDiscount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold">{t('total')}</span>
              <span className="font-display text-xl font-bold text-primary-800 dark:text-primary-300">
                {formatMoney(grandTotal, symbol)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHOD_ICONS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id)
                    if (method.id !== 'CASH') setReceived(String(grandTotal))
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] font-semibold transition',
                    paymentMethod === method.id
                      ? 'border-accent-500 bg-accent-500/15 text-fg'
                      : 'border-border text-fg-muted hover:bg-surface-2',
                  )}
                >
                  <method.icon className="h-3.5 w-3.5" />
                  {paymentLabel(method.id)}
                </button>
              ))}
            </div>

            {paymentMethod === 'CASH' ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={t('received')}
                  type="number"
                  step="0.01"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder={String(grandTotal)}
                />
                <div>
                  <p className="mb-1 text-xs font-medium">{t('change')}</p>
                  <div className="flex h-9 items-center rounded-lg border border-border bg-surface-2 px-2 text-sm font-semibold">
                    {formatMoney(change, symbol)}
                  </div>
                </div>
              </div>
            ) : null}

            {paymentMethod === 'CREDIT' ? (
              <div className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2">
                <p className="font-display text-xs font-bold text-fg">{t('khataUdhaar')}</p>
                {selectedCustomer ? (
                  <>
                    <p className="text-xs text-fg">
                      <span className="font-semibold">{selectedCustomer.name}</span>
                      {' · '}
                      {formatMoney(customerBalance, symbol)} → {formatMoney(projectedKhata, symbol)}
                    </p>
                    <p className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      {t('amountAddedToKhata')}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {t('selectCustomerForUdhaar')}
                  </p>
                )}
              </div>
            ) : null}

            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHoldName('')
                  holdMutation.mutate()
                }}
                loading={holdMutation.isPending}
                disabled={!cart.length}
              >
                <Pause className="h-3.5 w-3.5" />
                {t('hold')}
              </Button>
              <Button
                variant="accent"
                onClick={() =>
                  completeMutation.mutate({
                    isCredit: paymentMethod === 'CREDIT',
                    customerName: selectedCustomer?.name,
                    projectedKhata,
                  })
                }
                loading={completeMutation.isPending}
                disabled={!cart.length || (paymentMethod === 'CREDIT' && !customerId)}
              >
                {t('completeSale')}
              </Button>
            </div>

            {lastSale ? (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                {t('reprintLastReceipt')}
              </Button>
            ) : null}

            {canReturn && lastSale ? (
              <Button variant="outline" size="sm" className="w-full" onClick={openReturnModal}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('returnLastSale')}
              </Button>
            ) : null}
          </div>
        </aside>

        <nav className="grid shrink-0 grid-cols-2 border-t border-border bg-surface lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePane('catalog')}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition',
              mobilePane === 'catalog'
                ? 'bg-primary-700/10 text-primary-800 dark:text-primary-300'
                : 'text-fg-muted',
            )}
          >
            <Package className="h-4 w-4" />
            {t('productsTab')}
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('cart')}
            className={cn(
              'flex min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-semibold transition',
              mobilePane === 'cart'
                ? 'bg-primary-700/10 text-primary-800 dark:text-primary-300'
                : 'text-fg-muted',
            )}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {cartQty > 0 ? t('cartWithQty', { qty: cartQty }) : t('cart')}
            </span>
            {cartQty > 0 ? (
              <span className="truncate text-xs font-bold text-primary-800 dark:text-primary-300">
                {formatMoney(grandTotal, symbol)}
              </span>
            ) : null}
          </button>
        </nav>

        <Modal open={holdOpen} onClose={() => setHoldOpen(false)} title={t('heldSalesTitle')} size="md">
          <div className="space-y-2">
            {(heldQuery.data ?? []).length === 0 ? (
              <EmptyState title={t('noHeldSales')} className="min-h-[120px]" />
            ) : (
              (heldQuery.data ?? []).map((held) => (
                <div
                  key={held.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{held.referenceName || t('heldCart')}</p>
                    <p className="text-xs text-fg-subtle">
                      {t('heldItemsMeta', {
                        count: held.items.length,
                        customer: held.customer?.name || t('common:walkIn'),
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setMobilePane('cart')
                      void resumeHeld(held.id)
                    }}
                  >
                    {t('resume')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </Modal>

        <Modal
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          title={t('salesReturnTitle')}
          size="lg"
        >
          <div className="space-y-3">
            <Input
              label={t('searchInvoice')}
              value={returnInvoiceSearch}
              onChange={(e) => setReturnInvoiceSearch(e.target.value)}
              placeholder={t('invoiceNumberPlaceholder')}
            />
            <Select
              label={t('sale')}
              value={returnSaleId}
              onChange={(e) => {
                setReturnSaleId(e.target.value)
                setReturnQtys({})
                const sale = (returnSalesQuery.data ?? []).find((s) => s.id === e.target.value)
                if (sale?.paymentMethod === 'CREDIT') setRefundMethod('CREDIT')
                else if (sale) setRefundMethod('CASH')
              }}
              options={[
                { label: returnSalesQuery.isLoading ? t('loadingEllipsis') : t('selectSale'), value: '' },
                ...(returnSalesQuery.data ?? [])
                  .filter((s) => s.status !== 'RETURNED' && s.status !== 'HELD')
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
                { label: t('cash'), value: 'CASH' },
                { label: t('card'), value: 'CARD' },
                { label: t('online'), value: 'ONLINE' },
                { label: t('credit'), value: 'CREDIT' },
              ]}
            />
            {returnSaleQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : returnSaleId && returnItems.length === 0 ? (
              <EmptyState title={t('noItemsOnSale')} className="min-h-[100px]" />
            ) : (
              returnItems.map((item) => {
                const sold = toNumber(item.quantity)
                const already = toNumber(item.returnedQty ?? 0)
                const available = Math.max(0, sold - already)
                const label =
                  [item.product?.name, item.product?.size].filter(Boolean).join(' · ') ||
                  item.productId
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-fg-subtle">
                        {t('soldMeta', { sold })}
                        {already > 0 ? t('returnedMeta', { returned: already }) : ''}
                        {t('availableMeta', { available })}
                      </p>
                    </div>
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      max={available}
                      disabled={available <= 0}
                      value={returnQtys[item.productId] || 0}
                      onChange={(e) => {
                        const next = Math.min(Number(e.target.value) || 0, available)
                        setReturnQtys((prev) => ({ ...prev, [item.productId]: next }))
                      }}
                    />
                  </div>
                )
              })
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReturnOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                loading={returnMutation.isPending}
                disabled={!returnSaleId}
                onClick={() => returnMutation.mutate()}
              >
                {t('submitReturn')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  )
}
