import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import type { AppLanguage } from '@/i18n'

const LANGUAGES: Array<{ code: AppLanguage; label: string; short: string }> = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ur', label: 'اردو', short: 'UR' },
  { code: 'ar', label: 'العربية', short: 'AR' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] as AppLanguage

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-0.5',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Languages className="ms-1.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
      {LANGUAGES.map((lang) => {
        const active = current === lang.code
        return (
          <button
            key={lang.code}
            type="button"
            title={lang.label}
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(lang.code)}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-semibold transition',
              active
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
            )}
          >
            {lang.short}
          </button>
        )
      })}
    </div>
  )
}
