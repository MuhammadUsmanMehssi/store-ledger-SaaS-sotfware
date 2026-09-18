import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  email: string
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)

  const schema = useMemo(
    () => z.object({ email: z.string().email(t('validEmail')) }),
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
      const res = await authApi.forgotPassword(values.email)
      setResetToken(res.data?.resetToken ?? null)
      toast.success(res.message || t('checkEmailInstructions'))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('requestFailed'))
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{t('forgotTitle')}</h1>
        <p className="mt-1.5 text-sm text-fg-muted">{t('forgotSubtitle')}</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label={t('email')} type="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" fullWidth loading={loading}>
          {t('sendResetLink')}
        </Button>
      </form>
      {resetToken ? (
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-fg-muted">
          {t('devResetToken')} <span className="break-all font-mono text-fg">{resetToken}</span>
          <br />
          <Link className="text-primary-700 underline" to={`/reset-password?token=${resetToken}`}>
            {t('continueToReset')}
          </Link>
        </p>
      ) : null}
      <Link to="/login" className="block text-center text-sm font-medium text-primary-700">
        {t('backToSignIn')}
      </Link>
    </div>
  )
}
