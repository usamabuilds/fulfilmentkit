import { cn } from '@/lib/utils/cn'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  accent?: 'default' | 'success' | 'warning' | 'destructive'
}

export function StatCard({ label, value, subtext, accent = 'default' }: StatCardProps) {
  return (
    <div className="glass-panel p-5">
      <p className="text-subhead text-text-secondary mb-1">{label}</p>
      <p
        className={cn(
          'text-title-2',
          accent === 'success' && 'text-success',
          accent === 'warning' && 'text-warning',
          accent === 'destructive' && 'text-destructive',
          accent === 'default' && 'text-text-primary',
        )}
      >
        {value}
      </p>
      {subtext && <p className="text-footnote text-text-tertiary mt-1">{subtext}</p>}
    </div>
  )
}
