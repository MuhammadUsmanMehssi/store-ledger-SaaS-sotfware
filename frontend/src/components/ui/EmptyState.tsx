import { Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-2/60 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-700/10 text-primary-700">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
