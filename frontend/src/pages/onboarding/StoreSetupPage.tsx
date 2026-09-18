import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { tenantApi } from '@/api/tenantApi'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'

type FormValues = {
  name: string
  businessName?: string
  phone?: string
  email?: string
  address?: string
  currency: string
  currencySymbol: string
  invoicePrefix: string
  lowStockThreshold: number
}

export default function StoreSetupPage() {
  const { t } = useTranslation('onboarding')
  const { setTenant, refreshMe } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('storeNameRequired')),
        businessName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        address: z.string().optional(),
        currency: z.string().min(1),
        currencySymbol: z.string().min(1),
        invoicePrefix: z.string().min(1),
        lowStockThreshold: z.coerce.number().min(0),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'PKR',
      currencySymbol: 'Rs',
      invoicePrefix: 'INV',
      lowStockThreshold: 5,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true)
    try {
      const res = await tenantApi.setup({
        ...values,
        email: values.email || undefined,
      })
      setTenant(res.data)
      await refreshMe()
      toast.success(t('storeReady'), t('welcomeToBrand'))
      navigate('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('setupFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardBody className="space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{t('badge')}</p>
            <h1 className="mt-1 font-display text-2xl font-bold">{t('title')}</h1>
            <p className="mt-1 text-sm text-fg-muted">{t('subtitle')}</p>
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <Input label={t('storeName')} error={errors.name?.message} {...register('name')} />
            </div>
            <Input label={t('businessName')} {...register('businessName')} />
            <Input label={t('phone')} {...register('phone')} />
            <Input label={t('email')} type="email" error={errors.email?.message} {...register('email')} />
            <div className="sm:col-span-2">
              <Input label={t('address')} {...register('address')} />
            </div>
            <Select
              label={t('currency')}
              options={[
                { label: 'PKR', value: 'PKR' },
                { label: 'USD', value: 'USD' },
                { label: 'INR', value: 'INR' },
              ]}
              {...register('currency')}
            />
            <Input label={t('currencySymbol')} {...register('currencySymbol')} />
            <Input label={t('invoicePrefix')} {...register('invoicePrefix')} />
            <Input
              label={t('lowStockThreshold')}
              type="number"
              error={errors.lowStockThreshold?.message}
              {...register('lowStockThreshold')}
            />
            <div className="sm:col-span-2 pt-2">
              <Button type="submit" fullWidth loading={loading}>
                {t('finishSetup')}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
