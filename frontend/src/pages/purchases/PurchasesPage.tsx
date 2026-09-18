import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { brandsApi } from '@/api/brandsApi'
import { categoriesApi } from '@/api/categoriesApi'
import { purchasesApi, purchaseReturnsApi } from '@/api/purchasesApi'
import { productsApi, unitsApi } from '@/api/productsApi'
import { suppliersApi } from '@/api/suppliersApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import type { PaymentMethod, Purchase } from '@/types'

type Line = { productId: string; quantity: number; unitPrice: number; discount: number }

type QuickProductValues = {
  name: string
  categoryId?: string
  brandId?: string
  unitId?: string
  flavor?: string
}

type PurchaseVariantRow = {
  key: string
  size: string
  purchasePrice: number
  salePrice: number
  quantity: number
  sku: string
  barcode: string
  skuManual: boolean
  barcodeManual: boolean
}

function newPurchaseVariantRow(): PurchaseVariantRow {
  return {
    key: crypto.randomUUID(),
    size: '',
    purchasePrice: 0,
    salePrice: 0,
    quantity: 1,
    sku: '',
    barcode: '',
    skuManual: false,
    barcodeManual: false,
  }
}

export default function PurchasesPage() {
  const { t } = useTranslation(['purchases', 'common', 'products'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()

  const quickProductSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('productNameRequired')),
        categoryId: z.string().optional(),
        brandId: z.string().optional(),
        unitId: z.string().optional(),
        flavor: z.string().optional(),
      }),
    [t],
  )
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<Purchase | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH')
  const [supplierId, setSupplierId] = useState('')
  const [paidAmount, setPaidAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }])
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [assignToLineIdx, setAssignToLineIdx] = useState(0)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [variants, setVariants] = useState<PurchaseVariantRow[]>([newPurchaseVariantRow()])
  const [regenKey, setRegenKey] = useState<string | null>(null)
  const codeGenSeq = useRef(0)

  const quickForm = useForm<QuickProductValues>({
    resolver: zodResolver(quickProductSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      brandId: '',
      unitId: '',
      flavor: '',
    },
  })

  const watchedName = useWatch({ control: quickForm.control, name: 'name' })
  const watchedFlavor = useWatch({ control: quickForm.control, name: 'flavor' })
  const debouncedName = useDebounce(watchedName?.trim() || '', 400)
  const debouncedFlavor = useDebounce(watchedFlavor?.trim() || '', 400)
  const list = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => (await purchasesApi.list({ limit: 50 })).data,
  })
  const detail = useQuery({
    queryKey: ['purchase', viewId],
    queryFn: async () => (await purchasesApi.get(viewId!)).data,
    enabled: Boolean(viewId),
  })
  const detailReturns = useQuery({
    queryKey: ['purchase-returns', viewId],
    queryFn: async () => (await purchaseReturnsApi.list({ purchaseId: viewId!, limit: 50 })).data,
    enabled: Boolean(viewId),
  })
  const returnRows = useMemo(
    () =>
      (detailReturns.data ?? []).flatMap((ret) =>
        (ret.items ?? []).map((item, idx) => ({
          key: `${ret.id}-${item.productId}-${idx}`,
          returnNumber: ret.returnNumber,
          returnDate: ret.returnDate,
          reason: ret.reason,
          productLabel:
            [item.product?.name, item.product?.size].filter(Boolean).join(' · ') || item.productId,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          lineTotal: toNumber(item.lineTotal),
        })),
      ),
    [detailReturns.data],
  )
  const suppliers = useQuery({
    queryKey: ['suppliers-mini'],
    queryFn: async () => (await suppliersApi.list({ limit: 100 })).data,
  })
  const products = useQuery({
    queryKey: ['products-mini'],
    queryFn: async () => (await productsApi.list({ limit: 100, isActive: true })).data,
    enabled: open,
  })
  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await categoriesApi.list({ limit: 100 })).data,
    enabled: productModalOpen,
  })
  const brands = useQuery({
    queryKey: ['brands', 'all'],
    queryFn: async () => (await brandsApi.list({ limit: 100, isActive: true })).data,
    enabled: productModalOpen,
  })
  const units = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await unitsApi.list({ limit: 100 })).data,
    enabled: productModalOpen,
  })

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unitPrice - l.discount, 0),
    [lines],
  )

  const updateVariant = (key: string, patch: Partial<PurchaseVariantRow>) => {
    setVariants((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const generateRowCodes = async (
    rowKey: string,
    fields: 'sku' | 'barcode' | 'both',
    size: string,
    opts?: { force?: boolean },
  ) => {
    const name = quickForm.getValues('name')?.trim()
    if (!name) {
      if (opts?.force) toast.error(t('enterProductNameFirst'))
      return
    }
    if (!size.trim()) {
      if (opts?.force) toast.error(t('enterSizeFirst'))
      return
    }
    const seq = ++codeGenSeq.current
    setRegenKey(`${rowKey}:${fields}`)
    try {
      const codes = (
        await productsApi.generateCodes({
          name,
          flavor: quickForm.getValues('flavor') || null,
          size: size.trim(),
          fields,
        })
      ).data
      if (seq !== codeGenSeq.current) return
      setVariants((prev) =>
        prev.map((row) => {
          if (row.key !== rowKey) return row
          const next = { ...row }
          if (codes.sku !== undefined && (opts?.force || !row.skuManual)) {
            next.sku = codes.sku
            if (opts?.force) next.skuManual = false
          }
          if (codes.barcode !== undefined && (opts?.force || !row.barcodeManual)) {
            next.barcode = codes.barcode
            if (opts?.force) next.barcodeManual = false
          }
          return next
        }),
      )
    } catch (err) {
      if (opts?.force) {
        toast.error(err instanceof ApiError ? err.message : t('products:couldNotGenerateCodes'))
      }
    } finally {
      setRegenKey(null)
    }
  }

  useEffect(() => {
    if (!productModalOpen || !debouncedName) return
    for (const row of variants) {
      if (!row.size.trim()) continue
      if (row.skuManual && row.barcodeManual) continue
      if (row.sku && row.barcode) continue
      void generateRowCodes(
        row.key,
        !row.skuManual && !row.barcodeManual ? 'both' : !row.skuManual ? 'sku' : 'barcode',
        row.size,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate when name/flavor change
  }, [productModalOpen, debouncedName, debouncedFlavor])

  const openQuickProduct = (lineIdx: number) => {
    setAssignToLineIdx(lineIdx)
    setShowNewCategory(false)
    setNewCategoryName('')
    setShowNewUnit(false)
    setNewUnitName('')
    setShowNewBrand(false)
    setNewBrandName('')
    setImageFile(null)
    setVariants([newPurchaseVariantRow()])
    quickForm.reset({
      name: '',
      categoryId: '',
      brandId: '',
      unitId: '',
      flavor: '',
    })
    setProductModalOpen(true)
  }

  const createCategory = useMutation({
    mutationFn: async (name: string) =>
      (await categoriesApi.create({ name: name.trim(), isActive: true })).data,
    onSuccess: async (category) => {
      toast.success(t('products:categoryAdded'))
      setShowNewCategory(false)
      setNewCategoryName('')
      qc.setQueryData(['categories', 'all'], (prev: typeof categories.data) =>
        prev ? [...prev, category] : [category],
      )
      await qc.invalidateQueries({ queryKey: ['categories'] })
      quickForm.setValue('categoryId', category.id)
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : t('products:couldNotAddCategory')),
  })

  const createUnit = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim()
      return (await unitsApi.create({ name: trimmed, abbreviation: trimmed.slice(0, 20) })).data
    },
    onSuccess: async (unit) => {
      toast.success(t('products:unitAdded'))
      setShowNewUnit(false)
      setNewUnitName('')
      qc.setQueryData(['units'], (prev: typeof units.data) =>
        prev ? [...prev, unit] : [unit],
      )
      await qc.invalidateQueries({ queryKey: ['units'] })
      quickForm.setValue('unitId', unit.id)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('products:couldNotAddUnit')),
  })

  const createBrand = useMutation({
    mutationFn: async (name: string) =>
      (await brandsApi.create({ name: name.trim(), isActive: true })).data,
    onSuccess: async (brand) => {
      toast.success(t('products:brandAdded'))
      setShowNewBrand(false)
      setNewBrandName('')
      qc.setQueryData(['brands', 'all'], (prev: typeof brands.data) =>
        prev ? [...prev, brand] : [brand],
      )
      await qc.invalidateQueries({ queryKey: ['brands'] })
      quickForm.setValue('brandId', brand.id)
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('products:couldNotAddBrand')),
  })

  const createProduct = useMutation({
    mutationFn: async (values: QuickProductValues) => {
      const cleaned = variants
        .map((v) => ({
          size: v.size.trim(),
          sku: v.sku.trim() || undefined,
          barcode: v.barcode.trim() || undefined,
          purchasePrice: Number(v.purchasePrice) || 0,
          salePrice: Number(v.salePrice) || 0,
          currentStock: 0,
        }))
        .filter((v) => v.size)

      if (!cleaned.length) {
        throw new ApiError(t('products:addAtLeastOneSize'), 400)
      }

      return (
        await productsApi.createVariants(
          {
            name: values.name.trim(),
            categoryId: values.categoryId || null,
            brandId: values.brandId || null,
            unitId: values.unitId || null,
            flavor: values.flavor || null,
            isActive: true,
            variants: cleaned,
          },
          imageFile,
        )
      ).data
    },
    onSuccess: async (createdProducts) => {
      const products = Array.isArray(createdProducts) ? createdProducts : [createdProducts]
      const sourceRows = variants.filter((v) => v.size.trim())
      const count = products.length
      toast.success(
        count > 1 ? t('sizesAddedToPurchase', { count }) : t('productAdded'),
        count > 1 ? t('extraSizesAsLines') : t('selectedOnLine'),
      )
      setProductModalOpen(false)
      setImageFile(null)
      await qc.invalidateQueries({ queryKey: ['products-mini'] })
      await qc.invalidateQueries({ queryKey: ['products'] })
      setLines((prev) => {
        let next = [...prev]
        products.forEach((product, i) => {
          const row = sourceRows[i]
          if (!row) return
          if (i === 0) {
            next = next.map((l, idx) =>
              idx === assignToLineIdx
                ? {
                    ...l,
                    productId: product.id,
                    quantity: row.quantity,
                    unitPrice: row.purchasePrice,
                  }
                : l,
            )
          } else {
            next = [
              ...next,
              {
                productId: product.id,
                quantity: row.quantity,
                unitPrice: row.purchasePrice,
                discount: 0,
              },
            ]
          }
        })
        return next
      })
    },
    onError: (e) => {
      const message = e instanceof ApiError ? e.message : t('couldNotAddProduct')
      if (/sku|barcode/i.test(message)) {
        toast.error(message, t('products:skuBarcodeHint'))
      } else {
        toast.error(message)
      }
    },
  })

  const resetPurchaseForm = () => {
    setEditingId(null)
    setSupplierId('')
    setPaidAmount('0')
    setPaymentMethod('CASH')
    setLines([{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }])
  }

  const closeForm = () => {
    setOpen(false)
    resetPurchaseForm()
  }

  const openNew = () => {
    resetPurchaseForm()
    setOpen(true)
  }

  const openEdit = async (id: string) => {
    try {
      const purchase = (await purchasesApi.get(id)).data
      if (purchase.status !== 'DRAFT') {
        toast.error(t('onlyDraftEditable'))
        return
      }
      setEditingId(purchase.id)
      setSupplierId(purchase.supplierId || '')
      setPaidAmount(String(toNumber(purchase.paidAmount)))
      setPaymentMethod(purchase.paymentMethod || 'CASH')
      setLines(
        (purchase.items ?? []).length
          ? (purchase.items ?? []).map((item) => ({
              productId: item.productId,
              quantity: toNumber(item.quantity),
              unitPrice: toNumber(item.unitPrice),
              discount: toNumber(item.discount ?? 0),
            }))
          : [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }],
      )
      setViewId(null)
      setOpen(true)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('couldNotLoadPurchase'))
    }
  }

  const buildItems = () => {
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
      }))
    if (!items.length) throw new ApiError(t('addAtLeastOneItem'), 400)
    return items
  }

  const openPay = (purchase: Purchase) => {
    const due = toNumber(purchase.remainingAmount)
    if (due <= 0) {
      toast.error(t('alreadyFullyPaid'))
      return
    }
    setPayFor(purchase)
    setPayAmount(String(due))
    setPayMethod('CASH')
  }

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!payFor) throw new ApiError(t('noPurchaseSelected'), 400)
      const amount = Number(payAmount)
      if (!(amount > 0)) throw new ApiError(t('enterPaymentAmount'), 400)
      return purchasesApi.recordPayment(payFor.id, {
        amount,
        paymentMethod: payMethod,
      })
    },
    onSuccess: (res) => {
      const updated = res.data
      toast.success(
        updated.paymentStatus === 'PAID' ? t('markedAsPaid') : t('paymentRecorded'),
        updated.paymentStatus === 'PAID'
          ? t('purchaseFullyPaid')
          : t('remainingAmount', { amount: formatMoney(updated.remainingAmount, symbol) }),
      )
      setPayFor(null)
      setPayAmount('')
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['purchase'] })
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
      void qc.invalidateQueries({ queryKey: ['suppliers-mini'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:paymentFailed')),
  })

  const resolvePaymentMethod = (paid: number, method: PaymentMethod): PaymentMethod =>
    paid > 0 ? method : 'CREDIT'

  const saveDraft = useMutation({
    mutationFn: async () => {
      const items = buildItems()
      const paid = Number(paidAmount) || 0
      const method = resolvePaymentMethod(paid, paymentMethod)
      if (editingId) {
        return purchasesApi.update(editingId, {
          supplierId: supplierId || null,
          paidAmount: paid,
          paymentMethod: method,
          items,
        })
      }
      return purchasesApi.create({
        supplierId: supplierId || undefined,
        paidAmount: paid,
        paymentMethod: method,
        status: 'DRAFT',
        items,
      })
    },
    onSuccess: () => {
      toast.success(editingId ? t('draftUpdated') : t('draftSaved'))
      closeForm()
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['purchase'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotSaveDraft')),
  })

  const completeDraft = useMutation({
    mutationFn: async (purchase: {
      id: string
      paidAmount?: number | string
      paymentMethod?: PaymentMethod | null
    }) => {
      const paid = toNumber(purchase.paidAmount ?? 0)
      return purchasesApi.complete(purchase.id, {
        paidAmount: paid,
        paymentMethod: resolvePaymentMethod(paid, purchase.paymentMethod || 'CASH'),
      })
    },
    onSuccess: () => {
      toast.success(t('purchaseCompleted'), t('stockAddedToInventory'))
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['purchase'] })
      void qc.invalidateQueries({ queryKey: ['inventory-stock'] })
      void qc.invalidateQueries({ queryKey: ['products-mini'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('couldNotComplete')),
  })

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> {t('newPurchase')}
          </Button>
        }
      />
      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('emptyTitle')}
        columns={[
          { key: 'inv', header: t('columns.invoice'), render: (r) => r.invoiceNumber },
          { key: 'date', header: t('columns.date'), render: (r) => formatDate(r.purchaseDate) },
          {
            key: 'supplier',
            header: t('columns.supplier'),
            render: (r) => r.supplier?.name || t('common:dash'),
          },
          {
            key: 'total',
            header: t('columns.total'),
            render: (r) => formatMoney(r.netTotal ?? r.grandTotal, symbol),
          },
          {
            key: 'paid',
            header: t('columns.paid'),
            render: (r) => formatMoney(r.paidAmount, symbol),
          },
          {
            key: 'due',
            header: t('columns.due'),
            render: (r) => formatMoney(r.remainingAmount, symbol),
          },
          {
            key: 'recoverable',
            header: t('columns.recoverable'),
            render: (r) =>
              toNumber(r.recoverable ?? 0) > 0 ? formatMoney(r.recoverable, symbol) : t('common:dash'),
          },
          {
            key: 'payment',
            header: t('columns.payment'),
            render: (r) => (
              <Badge
                tone={
                  r.paymentStatus === 'PAID'
                    ? 'success'
                    : r.paymentStatus === 'PARTIAL'
                      ? 'warning'
                      : 'danger'
                }
              >
                {r.paymentStatus || 'UNPAID'}
              </Badge>
            ),
          },
          {
            key: 'status',
            header: t('columns.stock'),
            render: (r) => (
              <Badge
                tone={
                  r.status === 'COMPLETED' || r.status === 'PARTIALLY_RETURNED' || r.status === 'RETURNED'
                    ? 'success'
                    : r.status === 'DRAFT'
                      ? 'warning'
                      : 'default'
                }
              >
                {r.status === 'COMPLETED'
                  ? 'RECEIVED'
                  : r.status === 'PARTIALLY_RETURNED'
                    ? 'PARTIAL RETURN'
                    : r.status === 'RETURNED'
                      ? 'RETURNED'
                      : r.status}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-2">
                {r.status === 'DRAFT' ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => void openEdit(r.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t('common:edit')}
                    </Button>
                    <Button
                      size="sm"
                      loading={completeDraft.isPending && completeDraft.variables?.id === r.id}
                      onClick={() => completeDraft.mutate(r)}
                    >
                      {t('common:complete')}
                    </Button>
                  </>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => setViewId(r.id)}>
                  {t('common:view')}
                </Button>
                {r.status !== 'DRAFT' && toNumber(r.remainingAmount) > 0 ? (
                  <Button size="sm" onClick={() => openPay(r)}>
                    {t('common:pay')}
                  </Button>
                ) : null}
                {r.status !== 'DRAFT' ? (
                  <Link to={`/purchase-returns?purchaseId=${r.id}`}>
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
        open={open}
        onClose={closeForm}
        title={editingId ? t('editDraft') : t('newPurchaseModal')}
        size="xl"
      >
        <div className="space-y-3">
          <Select
            label={t('common:supplier')}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={[
              { label: t('selectSupplier'), value: '' },
              ...(suppliers.data ?? []).map((s) => ({ label: s.name, value: s.id })),
            ]}
          />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-fg">{t('items')}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openQuickProduct(Math.max(0, lines.length - 1))}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('addNewProduct')}
              </Button>
            </div>
            {products.isError ? (
              <p className="text-sm text-danger">{t('couldNotLoadProducts')}</p>
            ) : null}
            {products.isSuccess && !(products.data ?? []).length ? (
              <p className="text-sm text-fg-muted">{t('noProductsYetHint')}</p>
            ) : null}
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_auto] gap-2">
                <Select
                  label={idx === 0 ? t('common:product') : undefined}
                  value={line.productId}
                  onChange={(e) => {
                    const product = products.data?.find((p) => p.id === e.target.value)
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? {
                              ...l,
                              productId: e.target.value,
                              unitPrice: product ? toNumber(product.purchasePrice) : l.unitPrice,
                            }
                          : l,
                      ),
                    )
                  }}
                  options={[
                    {
                      label: products.isLoading ? t('loadingProducts') : t('selectProduct'),
                      value: '',
                    },
                    ...(products.data ?? []).map((p) => ({
                      label: `${p.name}${p.size ? ` · ${p.size}` : ''}${p.sku ? ` (${p.sku})` : ''}`,
                      value: p.id,
                    })),
                  ]}
                />
                <Input
                  label={idx === 0 ? t('common:qty') : undefined}
                  type="number"
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, quantity: Number(e.target.value) || 0 } : l,
                      ),
                    )
                  }
                />
                <Input
                  label={idx === 0 ? t('common:unitPrice') : undefined}
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, unitPrice: Number(e.target.value) || 0 } : l,
                      ),
                    )
                  }
                />
                <Input
                  label={idx === 0 ? t('common:discount') : undefined}
                  type="number"
                  value={line.discount}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, discount: Number(e.target.value) || 0 } : l,
                      ),
                    )
                  }
                />
                <div className={idx === 0 ? 'flex items-end' : 'flex items-center'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setLines((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }])
              }
            >
              {t('addLine')}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label={t('paidAmount')}
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <Select
              label={t('common:paymentMethod')}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={[
                { label: t('common:cash'), value: 'CASH' },
                { label: t('common:card'), value: 'CARD' },
                { label: t('common:online'), value: 'ONLINE' },
                { label: t('common:credit'), value: 'CREDIT' },
              ]}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium">{t('common:total')}</p>
              <div className="flex h-10 items-center rounded-xl border border-border px-3 font-semibold">
                {formatMoney(total, symbol)}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>
              {t('common:cancel')}
            </Button>
            <Button loading={saveDraft.isPending} onClick={() => saveDraft.mutate()}>
              {t('saveDraft')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false)
          setImageFile(null)
        }}
        title={t('addProductTitle')}
        description={t('addProductDescription')}
        size="xl"
        layer="elevated"
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={quickForm.handleSubmit((v) => createProduct.mutate(v))}
        >
          <div className="sm:col-span-2">
            <Input
              label={t('common:name')}
              error={quickForm.formState.errors.name?.message}
              {...quickForm.register('name')}
            />
          </div>
          <div className="space-y-1.5">
            <Select
              label={t('products:category')}
              options={[
                { label: t('common:none'), value: '' },
                ...(categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
              ]}
              {...quickForm.register('categoryId')}
            />
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  placeholder={t('newCategoryName')}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newCategoryName.trim()) createCategory.mutate(newCategoryName)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  loading={createCategory.isPending}
                  disabled={!newCategoryName.trim()}
                  onClick={() => createCategory.mutate(newCategoryName)}
                >
                  {t('common:add')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setShowNewCategory(false)
                    setNewCategoryName('')
                  }}
                >
                  {t('common:cancel')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-semibold text-primary-700 hover:underline"
                onClick={() => setShowNewCategory(true)}
              >
                {t('newCategory')}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Select
              label={t('products:unit')}
              options={[
                { label: t('common:none'), value: '' },
                ...(units.data ?? []).map((u) => ({ label: u.name, value: u.id })),
              ]}
              {...quickForm.register('unitId')}
            />
            {showNewUnit ? (
              <div className="flex gap-2">
                <Input
                  placeholder={t('newUnitEg')}
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newUnitName.trim()) createUnit.mutate(newUnitName)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  loading={createUnit.isPending}
                  disabled={!newUnitName.trim()}
                  onClick={() => createUnit.mutate(newUnitName)}
                >
                  {t('common:add')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setShowNewUnit(false)
                    setNewUnitName('')
                  }}
                >
                  {t('common:cancel')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-semibold text-primary-700 hover:underline"
                onClick={() => setShowNewUnit(true)}
              >
                {t('newUnit')}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Select
              label={t('products:brandOptional')}
              options={[
                { label: t('common:none'), value: '' },
                ...(brands.data ?? []).map((b) => ({ label: b.name, value: b.id })),
              ]}
              {...quickForm.register('brandId')}
            />
            {showNewBrand ? (
              <div className="flex gap-2">
                <Input
                  placeholder={t('newBrandName')}
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newBrandName.trim()) createBrand.mutate(newBrandName)
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  loading={createBrand.isPending}
                  disabled={!newBrandName.trim()}
                  onClick={() => createBrand.mutate(newBrandName)}
                >
                  {t('common:add')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    setShowNewBrand(false)
                    setNewBrandName('')
                  }}
                >
                  {t('common:cancel')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-semibold text-primary-700 hover:underline"
                onClick={() => setShowNewBrand(true)}
              >
                {t('newBrand')}
              </button>
            )}
          </div>
          <Input
            label={t('flavorOptional')}
            placeholder={t('flavorPlaceholder')}
            {...quickForm.register('flavor')}
          />
          <ImageUploadField
            className="sm:col-span-2"
            label={t('products:productImage')}
            file={imageFile}
            onChange={setImageFile}
            hint={t('productImageHint')}
          />

          <div className="sm:col-span-2 space-y-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-fg">{t('sizesPacks')}</p>
                <p className="text-xs text-fg-muted">{t('sizesHint')}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setVariants((prev) => [...prev, newPurchaseVariantRow()])}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('products:addSize')}
              </Button>
            </div>

            <div className="space-y-4">
              {variants.map((row, idx) => (
                <div
                  key={row.key}
                  className="space-y-2 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                      {t('products:sizeN', { n: idx + 1 })}
                      {row.size.trim() ? ` · ${row.size.trim()}` : ''}
                    </p>
                    {variants.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setVariants((prev) => prev.filter((v) => v.key !== row.key))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Input
                      label={t('products:size')}
                      placeholder={t('products:sizeShortPlaceholder')}
                      value={row.size}
                      onChange={(e) => updateVariant(row.key, { size: e.target.value })}
                      onBlur={() => {
                        if (row.size.trim() && (!row.sku || !row.barcode)) {
                          void generateRowCodes(row.key, 'both', row.size)
                        }
                      }}
                    />
                    <Input
                      label={t('products:purchase')}
                      type="number"
                      step="0.01"
                      value={row.purchasePrice}
                      onChange={(e) =>
                        updateVariant(row.key, { purchasePrice: Number(e.target.value) || 0 })
                      }
                    />
                    <Input
                      label={t('products:sale')}
                      type="number"
                      step="0.01"
                      value={row.salePrice}
                      onChange={(e) =>
                        updateVariant(row.key, { salePrice: Number(e.target.value) || 0 })
                      }
                    />
                    <Input
                      label={t('qtyThisPurchase')}
                      type="number"
                      value={row.quantity}
                      onChange={(e) =>
                        updateVariant(row.key, { quantity: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      label={t('products:sku')}
                      value={row.sku}
                      title={row.sku}
                      className="font-mono text-xs"
                      onChange={(e) =>
                        updateVariant(row.key, { sku: e.target.value, skuManual: true })
                      }
                      rightSlot={
                        <button
                          type="button"
                          className="rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                          title={t('products:generateSku')}
                          disabled={regenKey === `${row.key}:sku` || regenKey === `${row.key}:both`}
                          onClick={() =>
                            void generateRowCodes(row.key, 'sku', row.size, { force: true })
                          }
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${
                              regenKey?.startsWith(row.key) && regenKey.includes('sku')
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                        </button>
                      }
                    />
                    <Input
                      label={t('products:barcode')}
                      value={row.barcode}
                      title={row.barcode}
                      className="font-mono text-xs"
                      onChange={(e) =>
                        updateVariant(row.key, { barcode: e.target.value, barcodeManual: true })
                      }
                      rightSlot={
                        <button
                          type="button"
                          className="rounded-md p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                          title={t('products:generateBarcode')}
                          disabled={
                            regenKey === `${row.key}:barcode` || regenKey === `${row.key}:both`
                          }
                          onClick={() =>
                            void generateRowCodes(row.key, 'barcode', row.size, { force: true })
                          }
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${
                              regenKey?.startsWith(row.key) && regenKey.includes('barcode')
                                ? 'animate-spin'
                                : ''
                            }`}
                          />
                        </button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setProductModalOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={createProduct.isPending}>
              {variants.filter((v) => v.size.trim()).length > 1
                ? t('saveNSizesAndUse', {
                    count: variants.filter((v) => v.size.trim()).length,
                  })
                : t('saveAndUse')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewId)}
        onClose={() => setViewId(null)}
        title={detail.data?.invoiceNumber || t('title')}
        size="xl"
      >
        {detail.data ? (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-fg-muted">
                {detail.data.supplier?.name || t('common:dash')} · {formatDate(detail.data.purchaseDate)}
              </span>
              <Badge
                tone={
                  detail.data.status === 'COMPLETED' ||
                  detail.data.status === 'PARTIALLY_RETURNED' ||
                  detail.data.status === 'RETURNED'
                    ? 'success'
                    : detail.data.status === 'DRAFT'
                      ? 'warning'
                      : 'default'
                }
              >
                {detail.data.status === 'COMPLETED'
                  ? 'RECEIVED'
                  : detail.data.status === 'PARTIALLY_RETURNED'
                    ? 'PARTIAL RETURN'
                    : detail.data.status}
              </Badge>
              <Badge
                tone={
                  detail.data.paymentStatus === 'PAID'
                    ? 'success'
                    : detail.data.paymentStatus === 'PARTIAL'
                      ? 'warning'
                      : 'danger'
                }
              >
                {detail.data.paymentStatus || 'UNPAID'}
                {detail.data.paymentMethod ? ` · ${detail.data.paymentMethod}` : ''}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('invoiceTotal')}</p>
                <p className="font-semibold">{formatMoney(detail.data.grandTotal, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('returned')}</p>
                <p className="font-semibold">{formatMoney(detail.data.returnedAmount ?? 0, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('netTotal')}</p>
                <p className="font-semibold">
                  {formatMoney(detail.data.netTotal ?? detail.data.grandTotal, symbol)}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('common:paid')}</p>
                <p className="font-semibold">{formatMoney(detail.data.paidAmount, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('common:due')}</p>
                <p className="font-semibold">{formatMoney(detail.data.remainingAmount, symbol)}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-xs text-fg-muted">{t('columns.recoverable')}</p>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(detail.data.recoverable ?? 0, symbol)}
                </p>
              </div>
            </div>

            {detail.data.status !== 'DRAFT' && toNumber(detail.data.remainingAmount) > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2">
                <p className="text-fg-muted">
                  {t('outstandingDue', {
                    amount: formatMoney(detail.data.remainingAmount, symbol),
                  })}
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    openPay(detail.data!)
                    setViewId(null)
                  }}
                >
                  {t('recordPayment')}
                </Button>
              </div>
            ) : null}

            {toNumber(detail.data.recoverable ?? 0) > 0 ? (
              <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-fg-muted">
                {t('supplierOwesYou', {
                  amount: formatMoney(detail.data.recoverable, symbol),
                })}
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-fg">{t('purchasedItems')}</p>
              <DataTable
                rows={detail.data.items ?? []}
                rowKey={(r) => r.id || r.productId}
                columns={[
                  {
                    key: 'p',
                    header: t('common:product'),
                    render: (r) =>
                      [r.product?.name, r.product?.size].filter(Boolean).join(' · ') || r.productId,
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
                  {t('noReturnsAgainstPurchase')}
                </p>
              )}
            </div>

            {detail.data.status === 'DRAFT' ? (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => void openEdit(detail.data!.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common:edit')}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        open={Boolean(payFor)}
        onClose={() => setPayFor(null)}
        title={t('paymentTitle', { invoice: payFor?.invoiceNumber || '' })}
      >
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            {t('dueWithSupplier', { amount: formatMoney(payFor?.remainingAmount, symbol) })}
            {payFor?.supplier?.name ? ` · ${payFor.supplier.name}` : ''}
          </p>
          <Input
            label={t('common:amount')}
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <Select
            label={t('common:paymentMethod')}
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
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
            <Button loading={recordPayment.isPending} onClick={() => recordPayment.mutate()}>
              {t('recordPayment')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
