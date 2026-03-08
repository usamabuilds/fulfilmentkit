'use client'

import Link from 'next/link'
import { usePlans } from '@/lib/hooks/usePlanning'
import { formatDate } from '@/lib/utils/formatDate'

export default function PlanningPage() {
  const { data, isLoading } = usePlans()
  const plans = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">Planning</h1>
          <p className="mt-1 text-body text-text-secondary">Replenishment and inventory plans.</p>
        </div>
        <Link
          href="/planning/create"
          className="rounded-[8px] bg-accent px-4 py-2 text-callout text-white transition-all duration-200 hover:bg-accent-hover active:scale-[0.98]"
        >
          New Plan
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No plans yet.</p>
          <Link href="/planning/create" className="mt-2 block text-callout text-accent hover:underline">
            Create your first plan
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/planning/${plan.id}`}>
              <div className="glass-card flex items-center justify-between p-5">
                <div>
                  <p className="text-headline text-text-primary">{plan.name}</p>
                  <p className="mt-0.5 text-footnote text-text-tertiary">{formatDate(plan.createdAt)}</p>
                </div>
                <span className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 text-text-secondary">{plan.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
