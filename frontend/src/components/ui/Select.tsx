import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type SelectOption = { label: string; value: string }

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={selectId} className="block text-sm font-medium text-fg">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border border-border bg-surface px-3 text-sm text-fg transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-700/20 disabled:opacity-60',
            error && 'border-danger',
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="">{placeholder}</option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
