import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from './EmptyState'
import { Table, TBody, TD, TH, THead, TR } from './Table'
import { Skeleton } from './Skeleton'

export type DataTableColumn<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  showSerial = true,
  serialStart = 1,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  onEmptyAction?: () => void
  onRowClick?: (row: T) => void
  /** Show 1, 2, 3… (default on). Pass false to hide. */
  showSerial?: boolean
  serialStart?: number
}) {
  const { t } = useTranslation('common')
  const resolvedEmpty = emptyTitle ?? t('noRecordsFound')

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    )
  }

  if (!rows.length) {
    return (
      <EmptyState
        title={resolvedEmpty}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    )
  }

  return (
    <Table>
      <THead>
        <TR className="hover:bg-surface-2">
          {showSerial ? <TH className="w-12">#</TH> : null}
          {columns.map((col) => (
            <TH key={col.key} className={col.className}>
              {col.header}
            </TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row, idx) => (
          <TR key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {showSerial ? (
              <TD className="w-12 font-medium text-fg-muted">{serialStart + idx}</TD>
            ) : null}
            {columns.map((col) => (
              <TD key={col.key} className={col.className}>
                {col.render(row)}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
