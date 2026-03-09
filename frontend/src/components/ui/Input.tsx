import { cn } from '@/lib/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-subhead text-text-secondary">{label}</label>
      )}
      <input
        className={cn('glass-input', error && 'border-destructive', className)}
        {...props}
      />
      {error && <p className="text-footnote text-destructive">{error}</p>}
    </div>
  )
}
