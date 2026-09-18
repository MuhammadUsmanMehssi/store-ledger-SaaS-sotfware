import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { unitsApi } from '@/api/productsApi'
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
import type { Unit } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  abbreviation: z.string().min(1, 'Required').max(20),
})
type FormValues = z.infer<typeof schema>

export default function UnitsPage() {
  const { t } = useTranslation(['catalog', 'common'])
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [deleting, setDeleting] = useState<Unit | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { data, isLoading } = useQuery({
    queryKey: ['units', debounced],
    queryFn: async () => (await unitsApi.list({ search: debounced || undefined, limit: 100 })).data,
  })

  const save = useMutation({
    mutationFn: async (values: FormValues) =>
      editing ? unitsApi.update(editing.id, values) : unitsApi.create(values),
    onSuccess: () => {
      toast.success(editing ? t('units.updated') : t('units.created'))
      setOpen(false)
      setEditing(null)
      form.reset()
      void qc.invalidateQueries({ queryKey: ['units'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => unitsApi.remove(id),
    onSuccess: () => {
      toast.success(t('units.deleted'))
      setDeleting(null)
      void qc.invalidateQueries({ queryKey: ['units'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:deleteFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('units.title')}
        description={t('units.description')}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              form.reset({ name: '', abbreviation: '' })
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" /> {t('units.add')}
          </Button>
        }
      />
      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('units.searchPlaceholder')} />
      </div>
      <DataTable
        loading={isLoading}
        rows={data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('units.emptyTitle')}
        emptyDescription={t('units.emptyDescription')}
        emptyActionLabel={t('units.add')}
        onEmptyAction={() => {
          setEditing(null)
          form.reset({ name: '', abbreviation: '' })
          setOpen(true)
        }}
        columns={[
          { key: 'name', header: t('units.name'), render: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'abbr', header: t('units.abbreviation'), render: (r) => r.abbreviation },
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
                    form.reset({ name: r.name, abbreviation: r.abbreviation })
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
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('units.edit') : t('units.addModal')}>
        <form className="space-y-3" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <Input
            label={t('units.name')}
            placeholder={t('units.namePlaceholder')}
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input
            label={t('units.abbreviation')}
            placeholder={t('units.abbreviationPlaceholder')}
            error={form.formState.errors.abbreviation?.message}
            {...form.register('abbreviation')}
          />
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
        title={t('units.deleteTitle')}
        description={
          deleting
            ? t('units.deleteDescription', { name: deleting.name, abbreviation: deleting.abbreviation })
            : undefined
        }
        confirmLabel={t('common:delete')}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  )
}
