import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { enUS, ar } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import i18n from '@/i18n'

/** date-fns has no Urdu locale; Arabic is the closest RTL script locale. */
const LOCALES: Record<string, Locale> = {
  en: enUS,
  ar,
  ur: ar,
}

function currentLocale(): Locale {
  const lng = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  return LOCALES[lng] || enUS
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function formatDate(
  value: string | Date | null | undefined,
  pattern = 'dd MMM yyyy',
): string {
  const d = toDate(value)
  return d ? format(d, pattern, { locale: currentLocale() }) : '—'
}

export function formatDateTime(
  value: string | Date | null | undefined,
  pattern = 'dd MMM yyyy, hh:mm a',
): string {
  return formatDate(value, pattern)
}

export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: currentLocale() }) : '—'
}

export function toISODate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}
