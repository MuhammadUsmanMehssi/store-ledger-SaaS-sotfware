import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export type DropdownItem = {
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export function Dropdown({ items, label }: { items: DropdownItem[]; label?: string }) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const ariaLabel = label ?? t('actions')

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute end-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-soft)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              className={cn(
                'block w-full px-3 py-2 text-start text-sm transition hover:bg-surface-2 disabled:opacity-50',
                item.tone === 'danger' ? 'text-danger' : 'text-fg',
              )}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
