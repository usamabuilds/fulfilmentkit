import { cn } from '@/lib/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'rounded-[8px] font-medium transition-all duration-200 active:scale-[0.98]',
        size === 'md' && 'px-4 py-2 text-callout',
        size === 'sm' && 'px-3 py-1.5 text-subhead',
        variant === 'primary' && [
          'text-white bg-accent hover:bg-accent-hover',
          (disabled || loading) && 'bg-accent/50 cursor-not-allowed active:scale-100',
        ],
        variant === 'ghost' && [
          'text-text-secondary hover:text-text-primary hover:bg-black/5',
          (disabled || loading) && 'opacity-40 cursor-not-allowed',
        ],
        className
      )}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
