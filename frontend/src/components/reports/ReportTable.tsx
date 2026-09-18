import { useTranslation } from 'react-i18next'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  formatReportCell,
  formatSummaryLabel,
  formatSummaryValue,
  getReportColumns,
  humanLabel,
} from '@/utils/reportDisplay'

export function ReportSummaryCards({
  summary,
  currencySymbol,
}: {
  summary: Record<string, unknown>
  currencySymbol: string
}) {
  const entries = Object.entries(summary).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean',
  )

  if (!entries.length) return null

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      {entries.slice(0, 6).map(([key, value]) => (
        <Card key={key}>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-fg-subtle">
              {formatSummaryLabel(key)}
            </p>
            <p className="mt-1 font-display text-xl font-bold">
              {formatSummaryValue(key, value, currencySymbol)}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

export function ReportTable({
  rows,
  currencySymbol,
  startIndex = 0,
  emptyTitle,
}: {
  rows: Array<Record<string, unknown>>
  currencySymbol: string
  /** 0-based offset for pagination (serial continues across pages) */
  startIndex?: number
  emptyTitle?: string
}) {
  const { t } = useTranslation('common')

  if (!rows.length) {
    return <EmptyState title={emptyTitle ?? t('reportNoData')} />
  }

  const columns = getReportColumns(rows[0])

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-2 text-fg-muted">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold uppercase">#</th>
            {columns.map((k) => (
              <th key={k} className="px-3 py-2 text-xs font-semibold uppercase">
                {humanLabel(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-fg-muted">{startIndex + idx + 1}</td>
              {columns.map((k) => (
                <td key={k} className="px-3 py-2">
                  {formatReportCell(k, row[k], currencySymbol)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
