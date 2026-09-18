import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { tenantApi } from '@/api/tenantApi'
import { ApiError } from '@/api/client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ImageUploadField } from '@/components/ui/ImageUploadField'
import { LoadingState } from '@/components/ui/LoadingState'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { mediaUrl } from '@/utils/mediaUrl'

type FormValues = {
  name: string
  businessName?: string
  phone?: string
  email?: string
  address?: string
  currency: string
  currencySymbol: string
  invoicePrefix: string
  purchasePrefix: string
  receiptFooter?: string
  lowStockThreshold: number
  taxEnabled: boolean
  taxRate: number
  allowNegativeStock: boolean
}

export default function StoreSettingsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const toast = useToast()
  const { setTenant } = useAuth()
  const qc = useQueryClient()
  const form = useForm<FormValues>()
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const settings = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => (await tenantApi.getSettings()).data,
  })

  useEffect(() => {
    if (!settings.data) return
    form.reset({
      name: settings.data.name,
      businessName: settings.data.businessName || '',
      phone: settings.data.phone || '',
      email: settings.data.email || '',
      address: settings.data.address || '',
      currency: settings.data.currency,
      currencySymbol: settings.data.currencySymbol,
      invoicePrefix: settings.data.invoicePrefix,
      purchasePrefix: settings.data.purchasePrefix,
      receiptFooter: settings.data.receiptFooter || '',
      lowStockThreshold: settings.data.lowStockThreshold,
      taxEnabled: settings.data.taxEnabled,
      taxRate: Number(settings.data.taxRate) || 0,
      allowNegativeStock: settings.data.allowNegativeStock,
    })
    setLogoFile(null)
  }, [settings.data, form])

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await tenantApi.updateSettings(values)
      if (logoFile) {
        return tenantApi.uploadLogo(logoFile)
      }
      return res
    },
    onSuccess: (res) => {
      toast.success(t('store.saved'))
      setTenant(res.data)
      setLogoFile(null)
      void qc.invalidateQueries({ queryKey: ['tenant-settings'] })
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t('common:saveFailed')),
  })

  if (settings.isLoading && !settings.data) return <LoadingState />
  if (settings.isError || !settings.data) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
        {settings.error instanceof ApiError ? settings.error.message : t('common:requestFailed')}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('store.title')} description={t('store.description')} />
      <Card>
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <ImageUploadField
              className="sm:col-span-2"
              label={t('store.storeLogo')}
              file={logoFile}
              existingUrl={mediaUrl(settings.data.logoUrl)}
              onChange={setLogoFile}
              hint={t('store.logoHint')}
            />
            <Input label={t('store.storeName')} {...form.register('name')} />
            <Input label={t('store.businessName')} {...form.register('businessName')} />
            <Input label={t('store.phone')} {...form.register('phone')} />
            <Input label={t('store.storeContactEmail')} {...form.register('email')} />
            <div className="sm:col-span-2">
              <Input label={t('store.address')} {...form.register('address')} />
            </div>
            <Input label={t('store.currency')} {...form.register('currency')} />
            <Input label={t('store.currencySymbol')} {...form.register('currencySymbol')} />
            <Input label={t('store.invoicePrefix')} {...form.register('invoicePrefix')} />
            <Input label={t('store.purchasePrefix')} {...form.register('purchasePrefix')} />
            <Input
              label={t('store.lowStockThreshold')}
              type="number"
              {...form.register('lowStockThreshold', { valueAsNumber: true })}
            />
            <Input
              label={t('store.taxRate')}
              type="number"
              step="0.01"
              {...form.register('taxRate', { valueAsNumber: true })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('taxEnabled')} /> {t('store.taxEnabled')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('allowNegativeStock')} />{' '}
              {t('store.allowNegativeStock')}
            </label>
            <div className="sm:col-span-2">
              <Input label={t('store.receiptFooter')} {...form.register('receiptFooter')} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" loading={save.isPending}>
                {t('store.saveSettings')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
