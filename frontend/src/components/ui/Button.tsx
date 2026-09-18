import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-700 text-white hover:bg-primary-800 shadow-sm disabled:bg-primary-700/50',
  secondary:
    'bg-surface-3 text-fg border border-border hover:bg-border/60',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-3 hover:text-fg',
  danger: 'bg-danger text-white hover:brightness-110 shadow-sm',
  accent:
    'bg-accent-500 text-slate-900 hover:bg-accent-400 shadow-sm font-semibold',
  outline:
    'bg-transparent text-fg border border-border-strong hover:bg-surface-3',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-xl p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      fullWidth,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-display font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
