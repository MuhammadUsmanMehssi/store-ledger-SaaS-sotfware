import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { categoriesApi } from '@/api/categoriesApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import type { Category } from '@/types'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function CategoriesPage() {
  const { t } = useTranslation(['catalog', 'common'])
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { data, isLoading } = useQuery({
    queryKey: ['categories', debounced],
    queryFn: async () => (await categoriesApi.list({ search: debounced || undefined, limit: 100 })).data,
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) =>
      editing ? categoriesApi.update(editing.id, values) : categoriesApi.create(values),
    onSuccess: () => {
      toast.success(editing ? t('categories.updated') : t('categories.created'))
      setOpen(false)
      setEditing(null)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success(t('categories.deleted'))
      setDeleting(null)
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:deleteFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              form.reset({ name: '', description: '' })
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> {t('categories.add')}
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('categories.searchPlaceholder')} />
      </div>
      <DataTable
        loading={isLoading}
        rows={data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('categories.emptyTitle')}
        emptyDescription={t('categories.emptyDescription')}
        emptyActionLabel={t('categories.add')}
        onEmptyAction={() => setOpen(true)}
        columns={[
          { key: 'name', header: t('categories.name'), render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'desc', header: t('categories.descriptionField'), render: (r) => r.description || t('common:dash') },
          {
            key: 'status',
            header: t('common:status'),
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(r)
                    form.reset({ name: r.name, description: r.description || '' })
                    setOpen(true)
                  }}
                >
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
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('categories.edit') : t('categories.addModal')}
      >
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <Input
            label={t('categories.name')}
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input label={t('categories.descriptionField')} {...form.register('description')} />
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
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t('categories.deleteTitle')}
        description={
          deleting ? t('categories.deleteDescription', { name: deleting.name }) : undefined
        }
        confirmLabel={t('common:delete')}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  )
}
