import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
  layer = 'default',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Use "elevated" when stacking over another open modal */
  layer?: 'default' | 'elevated'
}) {
  const { t } = useTranslation('common')
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const capture = layer === 'elevated'
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (capture) e.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, capture)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, capture)
      document.body.style.overflow = ''
    }
  }, [open, onClose, layer])

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            'fixed inset-0 flex items-end justify-center sm:items-center sm:p-4',
            layer === 'elevated' ? 'z-[60]' : 'z-50',
          )}
        >
          <motion.button
            type="button"
            aria-label={t('closeDialog')}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-[var(--shadow-soft)] sm:rounded-2xl',
              widths[size],
              className,
            )}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  {title ? (
                    <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
                  ) : null}
                  {description ? (
                    <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('close')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
