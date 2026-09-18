import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/api/client'

type FormValues = {
  fullName: string
  email: string
  phone?: string
  storeName?: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const { register: registerUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().min(2, t('nameRequired')),
          email: z.string().email(t('validEmail')),
          phone: z.string().optional(),
          storeName: z.string().optional(),
          password: z.string().min(8, t('atLeast8Chars')),
          confirmPassword: z.string(),
        })
        .refine((v) => v.password === v.confirmPassword, {
          message: t('passwordsDoNotMatch'),
          path: ['confirmPassword'],
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true)
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        storeName: values.storeName,
      })
      toast.success(t('accountCreated'))
      navigate('/onboarding')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('registrationFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('registerTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-muted">{t('registerSubtitle')}</p>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input label={t('fullName')} error={errors.fullName?.message} {...register('fullName')} />
        <Input label={t('email')} type="email" error={errors.email?.message} {...register('email')} />
        <Input label={t('phone')} error={errors.phone?.message} {...register('phone')} />
        <Input label={t('storeNameOptional')} error={errors.storeName?.message} {...register('storeName')} />
        <Input label={t('password')} type="password" error={errors.password?.message} {...register('password')} />
        <Input
          label={t('confirmPassword')}
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth loading={loading} className="mt-2">
          {t('createAccount')}
        </Button>
      </form>
      <p className="text-center text-sm text-fg-muted">
        {t('alreadyHaveAccount')}{' '}
        <Link to="/login" className="font-semibold text-primary-700 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
