import { cn } from '@/utils/cn'

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
