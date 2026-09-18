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
import { isPlatformAdmin } from '@/utils/platform'

type FormValues = {
  email: string
  password: string
}

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common'])
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validEmail')),
        password: z.string().min(6, t('passwordRequired')),
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
      const payload = await login(values.email, values.password)
      toast.success(t('welcomeBack'), payload.user.fullName)
      if (isPlatformAdmin(payload.user)) {
        navigate('/admin/tenants')
        return
      }
      const onboarded = payload.tenant?.onboardingComplete ?? payload.user.tenant?.onboardingComplete
      if (onboarded === false) {
        navigate('/onboarding')
        return
      }
      navigate(payload.user.storeRole === 'CASHIER' ? '/pos' : '/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('loginFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[1.75rem]">
          {t('signInTitle')}
        </h1>
        <p className="mt-1.5 text-sm text-fg-muted">{t('signInSubtitle')}</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label={t('email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label={t('password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary-700 hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>
        <Button type="submit" fullWidth loading={loading}>
          {t('signIn')}
        </Button>
      </form>
    </div>
  )
}
