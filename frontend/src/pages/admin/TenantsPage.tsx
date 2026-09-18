import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Plus, Shield, Store } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminApi } from '@/api/adminApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { Modal } from '@/components/ui/Modal'
import { SearchInput } from '@/components/ui/SearchInput'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import {
  DEFAULT_ENABLED_MODULES,
  TENANT_MODULES,
  TENANT_MODULE_TREE,
  normalizeEnabledModules,
  setChildModule,
  setParentModule,
  type EnabledModules,
  type TenantModule,
} from '@/constants/modules'
import { formatDateTime } from '@/utils/formatDate'
import { mediaUrl } from '@/utils/mediaUrl'
import type { AdminTenant } from '@/types'

function DetailLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <p className="text-xs text-fg-muted">
      <span className="font-medium text-fg-subtle">{label}:</span> {value}
    </p>
  )
}

type CreateFormValues = {
  name: string
  businessName?: string
  phone?: string
  email?: string
  address?: string
  currency: string
  currencySymbol: string
  ownerFullName: string
  ownerEmail: string
  ownerPassword: string
  ownerPhone?: string
}

export default function TenantsPage() {
  const { t } = useTranslation(['admin', 'common'])
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [open, setOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [permTenant, setPermTenant] = useState<AdminTenant | null>(null)
  const [permModules, setPermModules] = useState<EnabledModules>(DEFAULT_ENABLED_MODULES)

  const createSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('storeNameRequired')),
        businessName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        currency: z.string().min(1),
        currencySymbol: z.string().min(1),
        ownerFullName: z.string().min(2, t('ownerNameRequired')),
        ownerEmail: z.string().email(t('validOwnerEmail')),
        ownerPassword: z.string().min(8, t('atLeast8Chars')),
        ownerPhone: z.string().optional(),
      }),
    [t],
  )

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await adminApi.stats()).data,
  })

  const listQuery = useQuery({
    queryKey: ['admin-tenants', debounced],
    queryFn: async () =>
      (await adminApi.listTenants({ search: debounced || undefined, limit: 50 })).data,
  })

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      currency: 'PKR',
      currencySymbol: 'Rs',
    },
  })

  const resetCreateForm = () => {
    form.reset({ currency: 'PKR', currencySymbol: 'Rs' })
    setLogoFile(null)
  }

  const openPermissions = (row: AdminTenant) => {
    setPermTenant(row)
    setPermModules(normalizeEnabledModules(row.enabledModules))
  }

  const setModule = (key: TenantModule, value: boolean, hasChildren: boolean) => {
    setPermModules((prev) =>
      hasChildren ? setParentModule(prev, key, value) : setChildModule(prev, key, value),
    )
  }

  const createMutation = useMutation({
    mutationFn: async (values: CreateFormValues) => {
      const created = await adminApi.createTenant({
        ...values,
        email: values.email || undefined,
        enabledModules: DEFAULT_ENABLED_MODULES,
      })
      if (logoFile) {
        await adminApi.uploadLogo(created.data.id, logoFile)
      }
      return created
    },
    onSuccess: () => {
      toast.success(t('created'), t('createdDetail'))
      setOpen(false)
      resetCreateForm()
      void qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('common:createFailed')),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateTenant(id, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? t('activated') : t('deactivated'))
      void qc.invalidateQueries({ queryKey: ['admin-tenants'] })
      void qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('common:updateFailed')),
  })

  const permissionsMutation = useMutation({
    mutationFn: async () => {
      if (!permTenant) throw new ApiError('No tenant selected', 400)
      return adminApi.updateTenant(permTenant.id, { enabledModules: permModules })
    },
    onSuccess: () => {
      toast.success(t('permissionsSaved'))
      setPermTenant(null)
      void qc.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t('common:updateFailed')),
  })

  const rows = listQuery.data ?? []

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            onClick={() => {
              resetCreateForm()
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            {t('newTenant')}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t('stats.totalTenants'), value: statsQuery.data?.tenantCount ?? t('common:dash') },
          { label: t('stats.activeTenants'), value: statsQuery.data?.activeTenants ?? t('common:dash') },
          { label: t('stats.storeUsers'), value: statsQuery.data?.userCount ?? t('common:dash') },
          { label: t('stats.products'), value: statsQuery.data?.productCount ?? t('common:dash') },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{stat.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-fg">{stat.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-4 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('searchPlaceholder')} />
      </div>

      <div className="overflow-x-auto">
      <DataTable<AdminTenant>
        loading={listQuery.isLoading}
        rows={rows}
        rowKey={(row) => row.id}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDescription')}
        emptyActionLabel={t('newTenant')}
        onEmptyAction={() => setOpen(true)}
        columns={[
          {
            key: 'store',
            header: t('columns.store'),
            render: (row) => {
              const logo = mediaUrl(row.logoUrl)
              return (
                <div className="flex min-w-[12rem] items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
                    {logo ? (
                      <img src={logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-fg-subtle" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{row.name}</p>
                    <p className="text-xs text-fg-subtle">{row.businessName || t('common:dash')}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">
                      {row.currencySymbol} · {row.currency}
                    </p>
                  </div>
                </div>
              )
            },
          },
          {
            key: 'contact',
            header: t('columns.contact'),
            render: (row) => (
              <div className="min-w-[10rem] space-y-0.5">
                <DetailLine label={t('phone')} value={row.phone} />
                <DetailLine label={t('email')} value={row.email} />
                <DetailLine label={t('address')} value={row.address} />
                {!row.phone && !row.email && !row.address ? (
                  <span className="text-xs text-fg-subtle">{t('common:dash')}</span>
                ) : null}
              </div>
            ),
          },
          {
            key: 'owner',
            header: t('columns.ownerLogin'),
            render: (row) =>
              row.owner ? (
                <div className="min-w-[10rem] space-y-0.5">
                  <p className="text-sm font-medium text-fg">{row.owner.fullName}</p>
                  <DetailLine label={t('email')} value={row.owner.email} />
                  <DetailLine label={t('phone')} value={row.owner.phone} />
                </div>
              ) : (
                <span className="text-fg-subtle">{t('common:dash')}</span>
              ),
          },
          {
            key: 'counts',
            header: t('columns.usage'),
            render: (row) => (
              <div className="text-sm text-fg-muted">
                <p>{t('usersCount', { count: row.userCount })}</p>
                <p>{t('productsCount', { count: row.productCount })}</p>
              </div>
            ),
          },
          {
            key: 'status',
            header: t('columns.status'),
            render: (row) => (
              <div className="space-y-1">
                <Badge tone={row.isActive ? 'success' : 'default'}>
                  {row.isActive ? t('common:active') : t('common:inactive')}
                </Badge>
                {!row.logoUrl ? (
                  <p className="flex items-center gap-1 text-[10px] text-fg-subtle">
                    <ImageIcon className="h-3 w-3" />
                    {t('noLogo')}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'created',
            header: t('columns.created'),
            render: (row) => (
              <span className="whitespace-nowrap text-sm text-fg-muted">
                {formatDateTime(row.createdAt)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openPermissions(row)}>
                  <Shield className="h-3.5 w-3.5" />
                  {t('permissions')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({ id: row.id, isActive: !row.isActive })
                  }
                >
                  {row.isActive ? t('deactivate') : t('activate')}
                </Button>
              </div>
            ),
          },
        ]}
      />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('createTitle')} size="lg">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              {t('storeDetails')}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">{t('storeDetailsHint')}</p>
          </div>
          <Input label={t('storeName')} error={form.formState.errors.name?.message} {...form.register('name')} />
          <Input label={t('businessName')} {...form.register('businessName')} />
          <Input label={t('storePhone')} {...form.register('phone')} />
          <Input
            label={t('storeContactEmailOptional')}
            type="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <div className="sm:col-span-2">
            <Input label={t('address')} {...form.register('address')} />
          </div>
          <Input label={t('currency')} {...form.register('currency')} />
          <Input label={t('currencySymbol')} {...form.register('currencySymbol')} />

          <ImageUploadField
            className="sm:col-span-2"
            label={t('storeLogo')}
            file={logoFile}
            onChange={setLogoFile}
            hint={t('logoHint')}
          />

          <div className="sm:col-span-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              {t('loginCredentials')}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">{t('loginCredentialsHint')}</p>
          </div>
          <Input
            label={t('ownerFullName')}
            error={form.formState.errors.ownerFullName?.message}
            {...form.register('ownerFullName')}
          />
          <Input label={t('ownerPhone')} {...form.register('ownerPhone')} />
          <Input
            label={t('ownerEmailLogin')}
            type="email"
            error={form.formState.errors.ownerEmail?.message}
            {...form.register('ownerEmail')}
          />
          <Input
            label={t('ownerPasswordLogin')}
            type="password"
            error={form.formState.errors.ownerPassword?.message}
            {...form.register('ownerPassword')}
          />

          <div className="flex gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              {t('createTenant')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(permTenant)}
        onClose={() => setPermTenant(null)}
        title={t('permissionsTitle', { name: permTenant?.name || '' })}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">{t('permissionsHint')}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPermModules({ ...DEFAULT_ENABLED_MODULES })}
            >
              {t('selectAll')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setPermModules(
                  Object.fromEntries(TENANT_MODULES.map((m) => [m, false])) as EnabledModules,
                )
              }
            >
              {t('clearAll')}
            </Button>
          </div>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
            {TENANT_MODULE_TREE.map((node) => {
              const children = node.children ?? []
              const hasChildren = children.length > 0
              const allChildrenOn = hasChildren && children.every((c) => permModules[c])
              const someChildrenOn = hasChildren && children.some((c) => permModules[c])
              const parentChecked = hasChildren ? allChildrenOn : permModules[node.key]

              return (
                <div
                  key={node.key}
                  className="rounded-xl border border-border px-3 py-2.5"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={parentChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = hasChildren && someChildrenOn && !allChildrenOn
                      }}
                      onChange={(e) => setModule(node.key, e.target.checked, hasChildren)}
                    />
                    <span>{t(`modules.${node.key}`)}</span>
                  </label>
                  {hasChildren ? (
                    <div className="mt-2 space-y-1.5 border-s border-border ps-4">
                      {children.map((child) => (
                        <label
                          key={child}
                          className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted hover:text-fg"
                        >
                          <input
                            type="checkbox"
                            checked={permModules[child]}
                            onChange={(e) => setModule(child, e.target.checked, false)}
                          />
                          <span>{t(`modules.${child}`)}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPermTenant(null)}>
              {t('common:cancel')}
            </Button>
            <Button loading={permissionsMutation.isPending} onClick={() => permissionsMutation.mutate()}>
              {t('savePermissions')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
