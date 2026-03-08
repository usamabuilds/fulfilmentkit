'use client'

import { useAiToolResults } from '@/lib/hooks/useAi'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'

const statusStyles: Record<string, string> = {
  success: 'bg-success/10 text-success',
  error: 'bg-destructive/10 text-destructive',
  pending: 'bg-warning/10 text-warning',
  running: 'bg-accent/10 text-accent',
}

export default function AiToolsPage() {
  const { data, isLoading } = useAiToolResults()
  const results = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Tool Results</h1>
        <p className="mt-1 text-body text-text-secondary">Results from AI tool executions.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No tool results yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <div key={result.id} className="glass-panel p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-headline text-text-primary">{result.tool}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-caption-2',
                    statusStyles[result.status.toLowerCase()] ?? 'bg-black/5 text-text-secondary',
                  )}
                >
                  {result.status}
                </span>
              </div>
              {result.result && (
                <p className="mt-2 overflow-x-auto rounded-[8px] bg-black/[0.03] p-3 font-mono text-footnote text-text-secondary">
                  {result.result}
                </p>
              )}
              <p className="mt-2 text-caption text-text-tertiary">{formatDateTime(result.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
