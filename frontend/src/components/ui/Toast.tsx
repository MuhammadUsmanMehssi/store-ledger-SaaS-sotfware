import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: string; title: string; description?: string; tone: ToastTone }

type ToastContextValue = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const [items, setItems] = useState<ToastItem[]>([])
  const reduce = useReducedMotion()

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: { title: string; description?: string; tone?: ToastTone }) => {
      const id = crypto.randomUUID()
      setItems((prev) => [
        ...prev,
        {
          id,
          title: input.title,
          description: input.description,
          tone: input.tone ?? 'info',
        },
      ])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: 'success' }),
      error: (title, description) => toast({ title, description, tone: 'error' }),
      info: (title, description) => toast({ title, description, tone: 'info' }),
    }),
    [toast],
  )

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
  }

  const tones = {
    success: 'border-emerald-500/30 bg-surface text-emerald-700 dark:text-emerald-300',
    error: 'border-red-500/30 bg-surface text-red-700 dark:text-red-300',
    info: 'border-primary-700/30 bg-surface text-primary-800 dark:text-primary-300',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed end-4 top-4 z-[70] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        <AnimatePresence>
          {items.map((item) => {
            const Icon = icons[item.tone]
            return (
              <motion.div
                key={item.id}
                initial={reduce ? false : { opacity: 0, y: -8, x: 8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                className={cn(
                  'pointer-events-auto flex gap-3 rounded-xl border px-3 py-2.5 shadow-[var(--shadow-soft)]',
                  tones[item.tone],
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{item.title}</p>
                  {item.description ? (
                    <p className="text-xs text-fg-muted">{item.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="text-fg-subtle hover:text-fg"
                  onClick={() => dismiss(item.id)}
                  aria-label={t('dismiss')}
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
