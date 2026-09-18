import i18n from '@/i18n'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { formatMoney, toNumber } from '@/utils/formatMoney'

const HIDDEN_KEYS = new Set([
  'id',
  'tenantId',
  'tenant_id',
  'categoryId',
  'unitId',
  'brandId',
  'customerId',
  'supplierId',
  'productId',
  'userId',
  'createdBy',
  'updatedBy',
  'deletedAt',
])

const MONEY_KEYS =
  /(?:amount|total|price|cost|value|paid|profit|cogs|grand|avgcost|saleprice|purchaseprice|stockvalue|balance|discount|tax|expense)/i

const QTY_KEYS =
  /(?:stock|qty|quantity|count|minimum|units?|pieces?|lowstock|productcount)/i

const DATE_KEYS = /(?:date|at|time)$/i

function humanLabel(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function formatNested(v: Record<string, unknown>): string {
  if (typeof v.name === 'string') {
    if (typeof v.abbreviation === 'string' && v.abbreviation) {
      return `${v.name} (${v.abbreviation})`
    }
    return v.name
  }
  if (typeof v.fullName === 'string') return v.fullName
  if (typeof v.invoiceNumber === 'string') return v.invoiceNumber
  if (typeof v.email === 'string') return v.email
  return '—'
}

export function getReportColumns(row: Record<string, unknown>): string[] {
  return Object.keys(row).filter((k) => !HIDDEN_KEYS.has(k) && !k.toLowerCase().endsWith('id'))
}

export function formatReportCell(
  key: string,
  value: unknown,
  currencySymbol: string,
): string {
  if (value == null || value === '') return '—'

  if (typeof value === 'boolean') return value ? i18n.t('yes') : i18n.t('no')

  if (isPlainObject(value)) return formatNested(value)

  if (Array.isArray(value)) return String(value.length)

  const keyLower = key.toLowerCase()

  if (DATE_KEYS.test(keyLower) || keyLower.includes('date')) {
    const s = String(value)
    if (s.includes('T') || /\d{2}:\d{2}/.test(s)) return formatDateTime(s)
    return formatDate(s)
  }

  if (typeof value === 'number' || (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value)))) {
    const n = toNumber(value as string | number)
    if (QTY_KEYS.test(keyLower) && !MONEY_KEYS.test(keyLower)) {
      return String(n)
    }
    if (MONEY_KEYS.test(keyLower)) {
      return formatMoney(n, currencySymbol)
    }
    // default numbers that look like money fields in reports
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return formatMoney(n, currencySymbol)
    }
    return String(n)
  }

  return String(value)
}

export function formatSummaryLabel(key: string) {
  return humanLabel(key)
}

export function formatSummaryValue(key: string, value: unknown, currencySymbol: string) {
  if (typeof value === 'boolean') return value ? i18n.t('yes') : i18n.t('no')
  if (typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value)))) {
    const n = toNumber(value as string | number)
    if (QTY_KEYS.test(key) && !MONEY_KEYS.test(key)) return String(n)
    if (MONEY_KEYS.test(key) || key.toLowerCase().includes('value')) {
      return formatMoney(n, currencySymbol)
    }
    return String(n)
  }
  return String(value ?? '—')
}

export { humanLabel }
