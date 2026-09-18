export function formatMoney(
  value: number | string | null | undefined,
  currencySymbol = 'Rs',
  fractionDigits = 2,
): string {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(num)) return `${currencySymbol} 0.00`
  return `${currencySymbol} ${num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}
