'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateForecast } from '@/lib/hooks/useForecast'
import { cn } from '@/lib/utils/cn'

export default function CreateForecastPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateForecast()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!name.trim()) return
    setError(null)
    mutate(
      { name: name.trim() },
      {
        onSuccess: () => router.push('/forecast'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create forecast'),
      }
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-title-1 text-text-primary">New Forecast</h1>
        <p className="text-body text-text-secondary mt-1">Create a new demand forecast.</p>
      </div>

      <div className="glass-panel p-6 flex flex-col gap-4">
        <div>
          <label className="text-subhead text-text-secondary block mb-1.5">Forecast name</label>
          <input
            className="glass-input"
            type="text"
            placeholder="e.g. Q3 2025 Demand Forecast"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {error && <p className="text-footnote text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
            className={cn(
              'px-4 py-2 rounded-[8px] text-callout text-white transition-all duration-200',
              isPending || !name.trim()
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {isPending ? 'Creating…' : 'Create Forecast'}
          </button>
          <button
            onClick={() => router.push('/forecast')}
            className="px-4 py-2 rounded-[8px] text-callout text-text-secondary hover:bg-black/5 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
