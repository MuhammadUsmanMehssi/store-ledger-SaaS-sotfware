import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'start',
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** Prefer start/end for RTL; left/right kept for compatibility */
  side?: 'left' | 'right' | 'start' | 'end'
  className?: string
}) {
  const { t, i18n } = useTranslation('common')
  const reduce = useReducedMotion()
  const rtl = i18n.dir() === 'rtl'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const resolvedSide =
    side === 'start' ? (rtl ? 'right' : 'left') : side === 'end' ? (rtl ? 'left' : 'right') : side
  const from = resolvedSide === 'left' ? -24 : 24

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label={t('closeDrawer')}
            className="absolute inset-0 bg-slate-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'absolute top-0 flex h-full w-[min(100%,20rem)] flex-col border-border bg-surface shadow-[var(--shadow-soft)]',
              resolvedSide === 'left' ? 'left-0 border-r' : 'right-0 border-l',
              className,
            )}
            initial={reduce ? false : { x: from, opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? undefined : { x: from, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-base font-semibold">{title}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
