import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { brandsApi } from '@/api/brandsApi'
import { categoriesApi } from '@/api/categoriesApi'
import { productsApi, unitsApi } from '@/api/productsApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuth } from '@/hooks/useAuth'
import { formatMoney, toNumber } from '@/utils/formatMoney'
import { mediaUrl } from '@/utils/mediaUrl'
import type { Product } from '@/types'

const sharedSchema = z.object({
  name: z.string().min(1, 'Required'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().optional(),
  flavor: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

const editSchema = sharedSchema.extend({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  size: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0),
})

type EditValues = z.infer<typeof editSchema>

type VariantRow = {
  key: string
  size: string
  purchasePrice: number
  salePrice: number
  currentStock: number
  minimumStock: number
  sku: string
  barcode: string
  skuManual: boolean
  barcodeManual: boolean
}

function newVariantRow(): VariantRow {
  return {
    key: crypto.randomUUID(),
    size: '',
    purchasePrice: 0,
    salePrice: 0,
    currentStock: 0,
    minimumStock: 0,
    sku: '',
    barcode: '',
    skuManual: false,
    barcodeManual: false,
  }
}

export default function ProductsPage() {
  const { t } = useTranslation(['products', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [page, setPage] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [quickBrand, setQuickBrand] = useState('')
  const [addingBrand, setAddingBrand] = useState(false)
  const [quickCategory, setQuickCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [quickUnit, setQuickUnit] = useState('')
  const [addingUnit, setAddingUnit] = useState(false)
  const [variants, setVariants] = useState<VariantRow[]>([newVariantRow()])
  const [regenKey, setRegenKey] = useState<string | null>(null)
  const codeGenSeq = useRef(0)

  const { data, isLoading } = useQuery({
    queryKey: ['products', debounced, page, categoryId, brandId],
    queryFn: async () => {
      const res = await productsApi.list({
        search: debounced || undefined,
        page,
        limit: 12,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
      })
      return res
    },
  })
  const pagination = data?.pagination

  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await categoriesApi.list({ limit: 100 })).data,
  })
  const brands = useQuery({
    queryKey: ['brands', 'all'],
    queryFn: async () => (await brandsApi.list({ limit: 100, isActive: true })).data,
  })
  const units = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await unitsApi.list({ limit: 100 })).data,
  })

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      purchasePrice: 0,
      salePrice: 0,
      minimumStock: 0,
      isActive: true,
    },
  })

  const watchedName = useWatch({ control: form.control, name: 'name' })
  const watchedFlavor = useWatch({ control: form.control, name: 'flavor' })
  const debouncedName = useDebounce(watchedName?.trim() || '', 400)
  const debouncedFlavor = useDebounce(watchedFlavor?.trim() || '', 400)

  const generateRowCodes = async (
    rowKey: string,
    fields: 'sku' | 'barcode' | 'both',
    size: string,
    opts?: { force?: boolean },
  ) => {
    const name = form.getValues('name')?.trim()
    if (!name || !size.trim()) return
    const seq = ++codeGenSeq.current
    setRegenKey(`${rowKey}:${fields}`)
    try {
      const codes = (
        await productsApi.generateCodes({
          name,
          flavor: form.getValues('flavor') || null,
          size: size.trim(),
          fields,
          excludeProductId: editing?.id,
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
        toast.error(err instanceof ApiError ? err.message : t('couldNotGenerateCodes'))
      }
    } finally {
      setRegenKey(null)
    }
  }

  // Auto-generate SKU/barcode for create rows when name/flavor/size ready
  useEffect(() => {
    if (!open || editing || !debouncedName) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: regenerate when name/flavor change
  }, [open, editing, debouncedName, debouncedFlavor])

  const saveMutation = useMutation({
    mutationFn: async (values: EditValues) => {
      if (editing) {
        const body = {
          ...values,
          categoryId: values.categoryId || null,
          brandId: values.brandId || null,
          unitId: values.unitId || null,
          sku: values.sku || undefined,
          barcode: values.barcode || undefined,
          flavor: values.flavor || null,
          size: values.size || null,
        }
        return (await productsApi.update(editing.id, body, imageFile)).data
      }

      const cleaned = variants
        .map((v) => ({
          size: v.size.trim(),
          sku: v.sku.trim() || undefined,
          barcode: v.barcode.trim() || undefined,
          purchasePrice: Number(v.purchasePrice) || 0,
          salePrice: Number(v.salePrice) || 0,
          minimumStock: Number(v.minimumStock) || 0,
          currentStock: Number(v.currentStock) || 0,
        }))
        .filter((v) => v.size)

      if (!cleaned.length) {
        throw new ApiError(t('addAtLeastOneSize'), 400)
      }

      return (
        await productsApi.createVariants(
          {
            name: values.name.trim(),
            categoryId: values.categoryId || null,
            brandId: values.brandId || null,
            unitId: values.unitId || null,
            flavor: values.flavor || null,
            description: values.description || null,
            isActive: true,
            variants: cleaned,
          },
          imageFile,
        )
      ).data
    },
    onSuccess: (result) => {
      const count = Array.isArray(result) ? result.length : 1
      toast.success(
        editing
          ? t('productUpdated')
          : count > 1
            ? t('sizesAdded', { count })
            : t('productCreated'),
      )
      setOpen(false)
      setEditing(null)
      setImageFile(null)
      setVariants([newVariantRow()])
      form.reset()
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : t('common:saveFailed')
      if (/sku|barcode/i.test(message)) {
        toast.error(message, t('skuBarcodeHint'))
      } else {
        toast.error(message)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast.success(t('productRemoved'))
      setDeleting(null)
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('common:deleteFailed')),
  })

  const quickAddBrand = async () => {
    const name = quickBrand.trim()
    if (!name) return
    setAddingBrand(true)
    try {
      const created = (await brandsApi.create({ name })).data
      await qc.invalidateQueries({ queryKey: ['brands'] })
      form.setValue('brandId', created.id)
      setQuickBrand('')
      toast.success(t('brandAdded'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('couldNotAddBrand'))
    } finally {
      setAddingBrand(false)
    }
  }

  const quickAddCategory = async () => {
    const name = quickCategory.trim()
    if (!name) return
    setAddingCategory(true)
    try {
      const created = (await categoriesApi.create({ name, isActive: true })).data
      qc.setQueryData(['categories', 'all'], (prev: typeof categories.data) =>
        prev ? [...prev, created] : [created],
      )
      await qc.invalidateQueries({ queryKey: ['categories'] })
      form.setValue('categoryId', created.id)
      setQuickCategory('')
      toast.success(t('categoryAdded'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('couldNotAddCategory'))
    } finally {
      setAddingCategory(false)
    }
  }

  const quickAddUnit = async () => {
    const name = quickUnit.trim()
    if (!name) return
    setAddingUnit(true)
    try {
      const abbreviation = name.slice(0, 20)
      const created = (await unitsApi.create({ name, abbreviation })).data
      qc.setQueryData(['units'], (prev: typeof units.data) =>
        prev ? [...prev, created] : [created],
      )
      await qc.invalidateQueries({ queryKey: ['units'] })
      form.setValue('unitId', created.id)
      setQuickUnit('')
      toast.success(t('unitAdded'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('couldNotAddUnit'))
    } finally {
      setAddingUnit(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setImageFile(null)
    setQuickBrand('')
    setQuickCategory('')
    setQuickUnit('')
    setVariants([newVariantRow()])
    form.reset({
      name: '',
      purchasePrice: 0,
      salePrice: 0,
      minimumStock: 0,
      isActive: true,
      categoryId: '',
      brandId: '',
      unitId: '',
      flavor: '',
      size: '',
      sku: '',
      barcode: '',
      description: '',
    })
    setOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setImageFile(null)
    setQuickBrand('')
    setQuickCategory('')
    setQuickUnit('')
    setVariants([newVariantRow()])
    form.reset({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      categoryId: product.categoryId || '',
      brandId: product.brandId || product.brandRef?.id || '',
      unitId: product.unitId || '',
      flavor: product.flavor || '',
      size: product.size || '',
      purchasePrice: toNumber(product.purchasePrice),
      salePrice: toNumber(product.salePrice),
      minimumStock: toNumber(product.minimumStock),
      description: product.description || '',
      isActive: product.isActive,
    })
    setOpen(true)
  }

  const updateVariant = (key: string, patch: Partial<VariantRow>) => {
    setVariants((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const rows = data?.data ?? []
  const categoryOptions = useMemo(
    () => [
      { label: t('allCategories'), value: '' },
      ...(categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
    ],
    [categories.data, t],
  )
  const brandFilterOptions = useMemo(
    () => [
      { label: t('allBrands'), value: '' },
      ...(brands.data ?? []).map((b) => ({ label: b.name, value: b.id })),
    ],
    [brands.data, t],
  )

  const sizedCount = variants.filter((v) => v.size.trim()).length

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('addProduct')}
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_180px]">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder={t('searchPlaceholder')}
        />
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(1)
          }}
        />
        <Select
          options={brandFilterOptions}
          value={brandId}
          onChange={(e) => {
            setBrandId(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <DataTable
        loading={isLoading}
        rows={rows}
        rowKey={(r) => r.id}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
        emptyActionLabel={t('addProduct')}
        onEmptyAction={openCreate}
        columns={[
          {
            key: 'image',
            header: '',
            className: 'w-14',
            render: (r) => {
              const src = mediaUrl(r.imageUrl)
              return src ? (
                <img src={src} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-3 text-fg-subtle">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )
            },
          },
          {
            key: 'name',
            header: t('columns.product'),
            render: (r) => (
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-fg-subtle">
                  {[r.flavor, r.size].filter(Boolean).join(' · ') || r.sku || r.barcode || t('common:dash')}
                </p>
              </div>
            ),
          },
          {
            key: 'category',
            header: t('columns.category'),
            render: (r) => r.category?.name || t('common:dash'),
          },
          {
            key: 'brand',
            header: t('columns.brand'),
            render: (r) => r.brand || r.brandRef?.name || t('common:dash'),
          },
          {
            key: 'size',
            header: t('columns.size'),
            render: (r) => r.size || t('common:dash'),
          },
          {
            key: 'price',
            header: t('columns.salePrice'),
            render: (r) => formatMoney(r.salePrice, symbol),
          },
          {
            key: 'stock',
            header: t('columns.stock'),
            render: (r) => {
              const stock = toNumber(r.currentStock)
              const min = toNumber(r.minimumStock)
              return <Badge tone={stock <= min ? 'warning' : 'success'}>{stock}</Badge>
            },
          },
          {
            key: 'status',
            header: t('columns.status'),
            render: (r) => (
              <Badge tone={r.isActive ? 'success' : 'default'}>
                {r.isActive ? t('common:active') : t('common:inactive')}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (r) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  {t('common:edit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(r)}>
                  {t('common:delete')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Pagination
        page={pagination?.page || page}
        totalPages={pagination?.totalPages || 1}
        total={pagination?.total}
        onPageChange={setPage}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('editProduct') : t('addProductModal')}
        description={editing ? undefined : t('addProductDescription')}
        size="xl"
      >
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={form.handleSubmit((v) => saveMutation.mutate(v as EditValues))}
        >
          <div className="sm:col-span-2">
            <Input
              label={t('name')}
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
          </div>

          <div className="space-y-1.5">
            <Select
              label={t('category')}
              options={[
                { label: t('common:none'), value: '' },
                ...(categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
              ]}
              {...form.register('categoryId')}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t('quickAddCategory')}
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void quickAddCategory()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={addingCategory}
                onClick={() => void quickAddCategory()}
                disabled={!quickCategory.trim()}
              >
                {t('common:add')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Select
              label={t('unit')}
              options={[
                { label: t('common:none'), value: '' },
                ...(units.data ?? []).map((u) => ({ label: u.name, value: u.id })),
              ]}
              {...form.register('unitId')}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t('quickAddUnit')}
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void quickAddUnit()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={addingUnit}
                onClick={() => void quickAddUnit()}
                disabled={!quickUnit.trim()}
              >
                {t('common:add')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Select
              label={t('brandOptional')}
              options={[
                { label: t('common:none'), value: '' },
                ...(brands.data ?? []).map((b) => ({ label: b.name, value: b.id })),
              ]}
              {...form.register('brandId')}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t('quickAddBrand')}
                value={quickBrand}
                onChange={(e) => setQuickBrand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void quickAddBrand()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={addingBrand}
                onClick={() => void quickAddBrand()}
                disabled={!quickBrand.trim()}
              >
                {t('common:add')}
              </Button>
            </div>
          </div>

          <Input
            label={t('flavor')}
            placeholder={t('flavorPlaceholder')}
            {...form.register('flavor')}
          />

          {editing ? (
            <>
              <Input label={t('sizeType')} placeholder={t('sizePlaceholder')} {...form.register('size')} />
              <Input label={t('sku')} {...form.register('sku')} />
              <Input label={t('barcode')} {...form.register('barcode')} />
              <Input
                label={t('purchasePrice')}
                type="number"
                step="0.01"
                {...form.register('purchasePrice')}
              />
              <Input
                label={t('salePrice')}
                type="number"
                step="0.01"
                {...form.register('salePrice')}
              />
              <Input label={t('minimumStock')} type="number" {...form.register('minimumStock')} />
            </>
          ) : (
            <div className="sm:col-span-2 space-y-2 rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-fg">{t('sizesPacks')}</p>
                  <p className="text-xs text-fg-muted">{t('sizesExample')}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setVariants((prev) => [...prev, newVariantRow()])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('addSize')}
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
                        {t('sizeN', { n: idx + 1 })}
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
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <Input
                        label={t('size')}
                        placeholder={t('sizeShortPlaceholder')}
                        value={row.size}
                        onChange={(e) => {
                          const size = e.target.value
                          updateVariant(row.key, { size })
                        }}
                        onBlur={() => {
                          if (row.size.trim() && (!row.sku || !row.barcode)) {
                            void generateRowCodes(row.key, 'both', row.size)
                          }
                        }}
                      />
                      <Input
                        label={t('purchase')}
                        type="number"
                        step="0.01"
                        value={row.purchasePrice}
                        onChange={(e) =>
                          updateVariant(row.key, { purchasePrice: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        label={t('sale')}
                        type="number"
                        step="0.01"
                        value={row.salePrice}
                        onChange={(e) =>
                          updateVariant(row.key, { salePrice: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        label={t('openingStock')}
                        type="number"
                        value={row.currentStock}
                        onChange={(e) =>
                          updateVariant(row.key, { currentStock: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        label={t('minStock')}
                        type="number"
                        value={row.minimumStock}
                        onChange={(e) =>
                          updateVariant(row.key, { minimumStock: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        label={t('sku')}
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
                            title={t('generateSku')}
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
                        label={t('barcode')}
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
                            title={t('generateBarcode')}
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
          )}

          <div className="sm:col-span-2">
            <Input label={t('descriptionField')} {...form.register('description')} />
          </div>
          <ImageUploadField
            className="sm:col-span-2"
            label={t('productImage')}
            file={imageFile}
            existingUrl={mediaUrl(editing?.imageUrl)}
            onChange={setImageFile}
            hint={t('productImageHint')}
          />
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              {editing
                ? t('common:save')
                : sizedCount > 1
                  ? t('saveNSizes', { count: sizedCount })
                  : t('common:save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('deleteTitle')}
        description={
          deleting
            ? deleting.size
              ? t('deleteDescriptionWithSize', { name: deleting.name, size: deleting.size })
              : t('deleteDescription', { name: deleting.name })
            : undefined
        }
        confirmLabel={t('common:delete')}
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  )
}
