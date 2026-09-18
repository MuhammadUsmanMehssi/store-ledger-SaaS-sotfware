import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { expensesApi } from '@/api/expensesApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'
import type { ExpenseCategory, PaymentMethod } from '@/types'

const expenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.coerce.number().positive(),
  expenseDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'ONLINE', 'CREDIT', 'MIXED']),
  description: z.string().optional(),
})
type ExpenseFormValues = z.infer<typeof expenseSchema>

export default function ExpensesPage() {
  const { t } = useTranslation(['expenses', 'common'])
  const { tenant } = useAuth()
  const symbol = tenant?.currencySymbol || 'Rs'
  const toast = useToast()
  const qc = useQueryClient()
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')

  const categorySchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('categoryNameRequired')),
      }),
    [t],
  )
  type CategoryFormValues = z.infer<typeof categorySchema>

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { paymentMethod: 'CASH', amount: 0 },
  })

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  })

  const list = useQuery({
    queryKey: ['expenses', categoryFilter],
    queryFn: async () =>
      (await expensesApi.list({ categoryId: categoryFilter || undefined, limit: 50 })).data,
  })

  const categories = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => (await expensesApi.categories()).data,
  })

  const saveExpense = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      expensesApi.create({
        ...values,
        categoryId: values.categoryId || undefined,
        paymentMethod: values.paymentMethod as PaymentMethod,
      }),
    onSuccess: () => {
      toast.success(t('expenseAdded'))
      setExpenseOpen(false)
      expenseForm.reset({ paymentMethod: 'CASH', amount: 0 })
      void qc.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const saveCategory = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      editingCategory
        ? expensesApi.updateCategory(editingCategory.id, values)
        : expensesApi.createCategory(values),
    onSuccess: () => {
      toast.success(editingCategory ? t('categoryUpdated') : t('categoryAdded'))
      setCategoryOpen(false)
      setEditingCategory(null)
      categoryForm.reset()
      void qc.invalidateQueries({ queryKey: ['expense-categories'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const removeCategory = useMutation({
    mutationFn: (id: string) => expensesApi.removeCategory(id),
    onSuccess: () => {
      toast.success(t('categoryRemoved'))
      setDeletingCategory(null)
      if (categoryFilter === deletingCategory?.id) setCategoryFilter('')
      void qc.invalidateQueries({ queryKey: ['expense-categories'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:deleteFailed')),
  })

  const openNewCategory = () => {
    setEditingCategory(null)
    categoryForm.reset({ name: '' })
    setCategoryOpen(true)
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openNewCategory}>
              <FolderPlus className="h-4 w-4" />
              {t('addCategory')}
            </Button>
            <Button onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('addExpense')}
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <CardBody className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-fg">{t('categoriesHeading')}</h2>
              <p className="text-xs text-fg-muted">{t('categoriesHint')}</p>
            </div>
            <Button size="sm" variant="outline" onClick={openNewCategory}>
              <Plus className="h-3.5 w-3.5" />
              {t('newCategory')}
            </Button>
          </div>
          {(categories.data ?? []).length === 0 ? (
            <p className="text-sm text-fg-muted">{t('noCategoriesYet')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(categories.data ?? []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1 rounded-full border border-border bg-surface-2 pl-3 pr-1 py-1"
                >
                  <span className="text-sm font-medium text-fg">{c.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setEditingCategory(c)
                      categoryForm.reset({ name: c.name })
                      setCategoryOpen(true)
                    }}
                  >
                    {t('common:edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-danger"
                    onClick={() => setDeletingCategory(c)}
                  >
                    {t('common:delete')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 max-w-xs">
        <Select
          label={t('filterByCategory')}
          options={[
            { label: t('allCategories'), value: '' },
            ...(categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
          ]}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
      </div>

      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('emptyTitle')}
        columns={[
          { key: 'date', header: t('columns.date'), render: (r) => formatDate(r.expenseDate) },
          {
            key: 'cat',
            header: t('columns.category'),
            render: (r) => r.category?.name || t('common:dash'),
          },
          {
            key: 'desc',
            header: t('columns.description'),
            render: (r) => r.description || t('common:dash'),
          },
          { key: 'amount', header: t('columns.amount'), render: (r) => formatMoney(r.amount, symbol) },
          { key: 'method', header: t('columns.method'), render: (r) => <Badge>{r.paymentMethod}</Badge> },
        ]}
      />

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title={t('addExpenseModal')}>
        <form className="space-y-3" onSubmit={expenseForm.handleSubmit((v) => saveExpense.mutate(v))}>
          <div>
            <Select
              label={t('columns.category')}
              options={[
                { label: t('uncategorized'), value: '' },
                ...(categories.data ?? []).map((c) => ({ label: c.name, value: c.id })),
              ]}
              {...expenseForm.register('categoryId')}
            />
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-primary-700 hover:underline"
              onClick={openNewCategory}
            >
              {t('addNewCategoryLink')}
            </button>
          </div>
          <Input
            label={t('formAmount')}
            type="number"
            step="0.01"
            error={expenseForm.formState.errors.amount?.message}
            {...expenseForm.register('amount')}
          />
          <Input label={t('formDate')} type="date" {...expenseForm.register('expenseDate')} />
          <Select
            label={t('paymentMethod')}
            options={[
              { label: t('common:cash'), value: 'CASH' },
              { label: t('common:card'), value: 'CARD' },
              { label: t('common:online'), value: 'ONLINE' },
            ]}
            {...expenseForm.register('paymentMethod')}
          />
          <Input label={t('formDescription')} {...expenseForm.register('description')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setExpenseOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={saveExpense.isPending}>
              {t('common:save')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={categoryOpen}
        onClose={() => {
          setCategoryOpen(false)
          setEditingCategory(null)
        }}
        title={editingCategory ? t('editCategory') : t('addExpenseCategory')}
      >
        <form className="space-y-3" onSubmit={categoryForm.handleSubmit((v) => saveCategory.mutate(v))}>
          <Input
            label={t('categoryName')}
            placeholder={t('categoryNamePlaceholder')}
            error={categoryForm.formState.errors.name?.message}
            {...categoryForm.register('name')}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCategoryOpen(false)
                setEditingCategory(null)
              }}
            >
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={saveCategory.isPending}>
              {editingCategory ? t('common:update') : t('addCategory')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title={t('removeCategoryTitle')}
        description={t('removeCategoryDescription', { name: deletingCategory?.name ?? '' })}
        confirmLabel={t('remove')}
        tone="danger"
        loading={removeCategory.isPending}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => deletingCategory && removeCategory.mutate(deletingCategory.id)}
      />
    </div>
  )
}
