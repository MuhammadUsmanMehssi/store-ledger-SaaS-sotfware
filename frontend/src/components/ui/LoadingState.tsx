import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

export function LoadingState({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <div
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center gap-3 text-fg-muted',
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary-700" />
      <p className="text-sm">{label ?? t('loading')}</p>
    </div>
  )
}
