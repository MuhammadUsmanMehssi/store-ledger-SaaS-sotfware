import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from './Input'
import { Button } from './Button'

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? t('search')}
      className={className}
      leftIcon={<Search className="h-4 w-4" />}
      rightSlot={
        value ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onChange('')}
            aria-label={t('clearSearch')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null
      }
    />
  )
}
