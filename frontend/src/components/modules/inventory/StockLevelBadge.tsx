import { cn } from '@/lib/utils/cn'

interface StockLevelBadgeProps {
  quantity: number
  threshold: number
}

export function StockLevelBadge({ quantity, threshold }: StockLevelBadgeProps) {
  const isLow = quantity <= threshold
  const isOut = quantity === 0

  return (
    <span
      className={cn(
        'text-caption-2 rounded-full px-2.5 py-1',
        isOut && 'bg-destructive/10 text-destructive',
        isLow && !isOut && 'bg-warning/10 text-warning',
        !isLow && 'bg-success/10 text-success',
      )}
    >
      {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
    </span>
  )
}
