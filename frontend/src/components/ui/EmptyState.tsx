interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="glass-panel p-12 text-center flex flex-col items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center mb-1">
        <span className="text-text-tertiary text-title-3">·</span>
      </div>
      <p className="text-headline text-text-primary">{title}</p>
      {subtitle && <p className="text-body text-text-secondary">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
