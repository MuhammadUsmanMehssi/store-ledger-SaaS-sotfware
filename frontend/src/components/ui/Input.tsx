import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightSlot?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightSlot, id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-medium text-fg">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
              {leftIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-700/20 disabled:opacity-60',
              leftIcon && 'pl-10',
              rightSlot && 'pr-10',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className,
            )}
            {...props}
          />
          {rightSlot ? (
            <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>
          ) : null}
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        {!error && hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
      </div>
    )
  },
)

Input.displayName = 'Input'
