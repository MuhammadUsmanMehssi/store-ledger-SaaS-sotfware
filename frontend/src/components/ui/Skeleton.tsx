import { cn } from '@/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-3 dark:bg-surface-3/80',
        className,
      )}
    />
  )
}
