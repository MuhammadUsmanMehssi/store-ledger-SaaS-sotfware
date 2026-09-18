import { cn } from '@/utils/cn'

export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-2 text-fg-muted">{children}</thead>
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TR({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-t border-border bg-surface transition hover:bg-surface-2/80',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function TH({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={cn('px-3 py-2.5 text-xs font-semibold uppercase tracking-wide', className)}>
      {children}
    </th>
  )
}

export function TD({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <td className={cn('px-3 py-2.5 text-fg', className)}>{children}</td>
}
