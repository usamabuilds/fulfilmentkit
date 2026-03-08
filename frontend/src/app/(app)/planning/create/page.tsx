'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreatePlan } from '@/lib/hooks/usePlanning'
import { cn } from '@/lib/utils/cn'

export default function CreatePlanPage() {
  const router = useRouter()
  const { mutate, isPending } = useCreatePlan()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!name.trim()) {
      return
    }

    setError(null)
    mutate(
      { name: name.trim() },
      {
        onSuccess: () => router.push('/planning'),
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create plan'),
      }
    )
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">New Plan</h1>
        <p className="mt-1 text-body text-text-secondary">Create a new replenishment plan.</p>
      </div>

      <div className="glass-panel flex flex-col gap-4 p-6">
        <div>
          <label className="mb-1.5 block text-subhead text-text-secondary">Plan name</label>
          <input
            className="glass-input"
            type="text"
            placeholder="e.g. Q3 2025 Replenishment Plan"
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
              'rounded-[8px] px-4 py-2 text-callout text-white transition-all duration-200',
              isPending || !name.trim()
                ? 'cursor-not-allowed bg-accent/50'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {isPending ? 'Creating…' : 'Create Plan'}
          </button>
          <button
            onClick={() => router.push('/planning')}
            className="rounded-[8px] px-4 py-2 text-callout text-text-secondary transition-all duration-200 hover:bg-black/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
