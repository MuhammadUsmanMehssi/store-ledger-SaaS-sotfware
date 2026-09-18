import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card, CardBody } from './Card'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  className,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: 'primary' | 'accent' | 'success' | 'danger' | 'warning'
  className?: string
}) {
  const tones = {
    primary: 'bg-primary-700/10 text-primary-700',
    accent: 'bg-accent-500/15 text-accent-600',
    success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    danger: 'bg-red-500/15 text-red-700 dark:text-red-300',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardBody className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-fg">{value}</p>
          {hint ? <p className="mt-1 text-xs text-fg-muted">{hint}</p> : null}
        </div>
        <div className={cn('rounded-xl p-2.5', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardBody>
    </Card>
  )
}
