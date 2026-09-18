import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { usersApi } from '@/api/usersApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import {
  CRUD_ACTIONS,
  PERMISSION_MODULES,
  roleDefaultPermissions,
  type CrudAction,
  type PermissionModule,
  type UserPermissionMap,
} from '@/constants/permissions'
import type { StoreRole, User } from '@/types'

type FormValues = {
  fullName: string
  email: string
  password?: string
  phone?: string
  storeRole: 'MANAGER' | 'CASHIER'
}

function PermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: UserPermissionMap
  onChange: (next: UserPermissionMap) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('settings')

  const toggle = (mod: PermissionModule, action: CrudAction) => {
    if (disabled) return
    onChange({
      ...value,
      [mod]: { ...value[mod], [action]: !value[mod][action] },
    })
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-sm">
        <thead className="bg-surface-2 text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-start font-medium">{t('users.module')}</th>
            {CRUD_ACTIONS.map((a) => (
              <th key={a} className="px-2 py-2 text-center font-medium">
                {t(`users.${a}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MODULES.map((mod) => (
            <tr key={mod} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-fg">{t(`users.permissionModules.${mod}`)}</td>
              {CRUD_ACTIONS.map((action) => (
                <td key={action} className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={value[mod][action]}
                    onChange={() => toggle(mod, action)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function UsersPage() {
  const { t } = useTranslation(['settings', 'common'])
  const { user: me } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const isOwner = me?.storeRole === 'OWNER'

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [permMap, setPermMap] = useState<UserPermissionMap>(roleDefaultPermissions('CASHIER'))
  const [useCustomPerms, setUseCustomPerms] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8).optional().or(z.literal('')),
        phone: z.string().optional(),
        storeRole: z.enum(['MANAGER', 'CASHIER']),
      }),
    [],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { storeRole: 'CASHIER', password: '' },
  })

  const list = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await usersApi.list({ limit: 50 })).data,
  })

  const watchRole = form.watch('storeRole')

  const openCreate = () => {
    setEditing(null)
    form.reset({ storeRole: 'CASHIER', fullName: '', email: '', phone: '', password: '' })
    setPermMap(roleDefaultPermissions('CASHIER'))
    setUseCustomPerms(false)
    setOpen(true)
  }

  const openEdit = (row: User) => {
    if (row.storeRole === 'OWNER') {
      toast.error(t('common:updateFailed'), 'Owner permissions cannot be edited')
      return
    }
    setEditing(row)
    form.reset({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone || '',
      storeRole: (row.storeRole as 'MANAGER' | 'CASHIER') || 'CASHIER',
      password: '',
    })
    const role = (row.storeRole as StoreRole) || 'CASHIER'
    if (row.permissions) {
      setPermMap(row.permissions)
      setUseCustomPerms(true)
    } else {
      setPermMap(row.effectivePermissions || roleDefaultPermissions(role))
      setUseCustomPerms(false)
    }
    setOpen(true)
  }

  const onRoleChange = (role: 'MANAGER' | 'CASHIER') => {
    form.setValue('storeRole', role)
    if (!useCustomPerms) setPermMap(roleDefaultPermissions(role))
  }

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      if (!values.password || values.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters', 400)
      }
      return usersApi.create({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        storeRole: values.storeRole,
        ...(useCustomPerms ? { permissions: permMap } : {}),
      })
    },
    onSuccess: () => {
      toast.success(t('users.created'))
      setOpen(false)
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:createFailed')),
  })

  const update = useMutation({
    mutationFn: (values: FormValues) => {
      if (!editing) throw new ApiError('No user', 400)
      return usersApi.update(editing.id, {
        fullName: values.fullName,
        phone: values.phone,
        storeRole: values.storeRole,
        ...(values.password ? { password: values.password } : {}),
        permissions: useCustomPerms ? permMap : null,
      })
    },
    onSuccess: () => {
      toast.success(t('users.updated'))
      setOpen(false)
      setEditing(null)
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:updateFailed')),
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => {
      toast.success(t('users.updated'))
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:updateFailed')),
  })

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          isOwner ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('users.addUser')}
            </Button>
          ) : null
        }
      />
      <DataTable
        loading={list.isLoading}
        rows={list.data ?? []}
        rowKey={(r) => r.id}
        emptyTitle={t('users.emptyTitle')}
        emptyDescription={t('users.emptyDescription')}
        columns={[
          { key: 'name', header: t('users.columns.name'), render: (r) => r.fullName },
          { key: 'email', header: t('users.columns.email'), render: (r) => r.email },
          {
            key: 'role',
            header: t('users.columns.role'),
            render: (r) => <Badge tone="info">{r.storeRole || t('common:dash')}</Badge>,
          },
          {
            key: 'perms',
            header: t('users.permissions'),
            render: (r) =>
              r.storeRole === 'OWNER' ? (
                <span className="text-xs text-fg-subtle">Full</span>
              ) : r.permissions ? (
                <Badge tone="warning">Custom</Badge>
              ) : (
                <span className="text-xs text-fg-subtle">Role default</span>
              ),
          },
          {
            key: 'status',
            header: t('users.columns.status'),
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
            render: (r) =>
              isOwner && r.storeRole !== 'OWNER' ? (
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t('users.editPermissions')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggle.mutate({ id: r.id, isActive: !r.isActive })}
                  >
                    {r.isActive ? t('users.deactivate') : t('users.activate')}
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('users.editUser') : t('users.addModal')}
        size="xl"
      >
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => (editing ? update.mutate(v) : create.mutate(v)))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t('users.fullName')}
              error={form.formState.errors.fullName?.message}
              {...form.register('fullName')}
            />
            <Input
              label={t('users.email')}
              type="email"
              disabled={Boolean(editing)}
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
            <Input label={t('users.phone')} {...form.register('phone')} />
            <Select
              label={t('users.role')}
              value={watchRole}
              onChange={(e) => onRoleChange(e.target.value as 'MANAGER' | 'CASHIER')}
              options={[
                { label: t('users.roles.cashier'), value: 'CASHIER' },
                { label: t('users.roles.manager'), value: 'MANAGER' },
              ]}
            />
            <Input
              label={editing ? `${t('users.password')} (optional)` : t('users.password')}
              type="password"
              error={form.formState.errors.password?.message}
              {...form.register('password', {
                validate: (v) => {
                  if (editing) return true
                  return (v && v.length >= 8) || 'At least 8 characters'
                },
              })}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-fg">{t('users.permissions')}</p>
                <p className="text-xs text-fg-muted">{t('users.permissionsHint')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={useCustomPerms ? 'outline' : 'secondary'}
                  onClick={() => {
                    setUseCustomPerms(false)
                    setPermMap(roleDefaultPermissions(watchRole))
                  }}
                >
                  {t('users.useRoleDefaults')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={useCustomPerms ? 'secondary' : 'outline'}
                  onClick={() => setUseCustomPerms(true)}
                >
                  {t('users.editPermissions')}
                </Button>
              </div>
            </div>
            <PermissionMatrix value={permMap} onChange={(next) => {
                setUseCustomPerms(true)
                setPermMap(next)
              }} />
            {!useCustomPerms ? (
              <p className="text-xs text-fg-subtle">
                Showing {watchRole} defaults — click &quot;{t('users.editPermissions')}&quot; then change checkboxes to customize.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {editing ? t('users.saveUser') : t('users.addUser')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
