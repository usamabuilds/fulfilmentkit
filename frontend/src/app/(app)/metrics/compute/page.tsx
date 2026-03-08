'use client'

import { useComputeMetrics } from '@/lib/hooks/useMetrics'
import { cn } from '@/lib/utils/cn'

export default function ComputeMetricsPage() {
  const { mutate, isPending, isSuccess, isError, error } = useComputeMetrics()

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Compute Metrics</h1>
        <p className="mt-1 text-body text-text-secondary">
          Trigger a metrics computation job for your workspace.
        </p>
      </div>

      <div className="glass-panel flex flex-col gap-4 p-6">
        <p className="text-body text-text-secondary">
          This will compute daily metrics from your orders and inventory data. The job runs in the
          background and may take a few minutes.
        </p>

        {isSuccess && <p className="text-footnote text-success">Compute job started successfully.</p>}
        {isError && (
          <p className="text-footnote text-destructive">
            {error instanceof Error ? error.message : 'Failed to start compute job.'}
          </p>
        )}

        <button
          onClick={() => mutate()}
          disabled={isPending}
          className={cn(
            'w-fit rounded-[8px] px-4 py-2 text-callout text-white transition-all duration-200',
            isPending
              ? 'cursor-not-allowed bg-accent/50'
              : 'bg-accent hover:bg-accent-hover active:scale-[0.98]',
          )}
        >
          {isPending ? 'Starting…' : 'Run Compute Job'}
        </button>
      </div>
    </div>
  )
}
