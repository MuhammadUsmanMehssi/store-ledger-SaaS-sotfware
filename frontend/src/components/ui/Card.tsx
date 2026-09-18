import { cn } from '@/utils/cn'

export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('border-b border-border px-4 py-3', className)}>{children}</div>
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('p-4', className)}>{children}</div>
}
