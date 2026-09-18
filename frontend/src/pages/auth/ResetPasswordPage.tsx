import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/api/authApi'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

type FormValues = {
  token: string
  password: string
  confirmPassword: string
}

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          token: z.string().min(1, t('tokenRequired')),
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: params.get('token') || '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true)
    try {
      await authApi.resetPassword({ token: values.token, password: values.password })
      toast.success(t('passwordUpdated'))
      navigate('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('resetFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('resetTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-muted">{t('resetSubtitle')}</p>
      </div>
      <form className="space-y-3" onSubmit={onSubmit}>
        <Input label={t('resetToken')} error={errors.token?.message} {...register('token')} />
        <Input label={t('newPassword')} type="password" error={errors.password?.message} {...register('password')} />
        <Input
          label={t('confirmPassword')}
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('updatePassword')}
        </Button>
      </form>
      <Link to="/login" className="block text-center text-sm font-medium text-primary-700">
        {t('backToSignIn')}
      </Link>
    </div>
  )
}
