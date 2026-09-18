import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
}) {
  const { t, i18n } = useTranslation('common')
  if (totalPages <= 1) return null

  const rtl = i18n.dir() === 'rtl'

  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <p className="text-xs text-fg-muted">
        {t('pageOf', { page, totalPages })}
        {typeof total === 'number' ? ` · ${t('totalCount', { total })}` : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {rtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {t('prev')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('next')}
          {rtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
