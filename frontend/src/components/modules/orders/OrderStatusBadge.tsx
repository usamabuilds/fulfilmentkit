import { cn } from '@/lib/utils/cn'

interface OrderStatusBadgeProps {
  status: string
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  processing: 'bg-accent/10 text-accent',
  shipped: 'bg-success/10 text-success',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
  refunded: 'bg-destructive/10 text-destructive',
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const style = statusStyles[status.toLowerCase()] ?? 'bg-black/5 text-text-secondary'
  return <span className={cn('text-caption-2 px-2.5 py-1 rounded-full', style)}>{status}</span>
}
