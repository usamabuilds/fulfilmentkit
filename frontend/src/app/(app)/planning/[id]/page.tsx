'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlanning'
import { formatDateTime } from '@/lib/utils/formatDate'

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePlan(id)
  const plan = data?.data

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-48" />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-body text-text-secondary">Plan not found.</p>
        <Link href="/planning" className="mt-2 block text-callout text-accent hover:underline">
          Back to Planning
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-subhead text-text-secondary transition-colors hover:text-text-primary">
          Planning
        </Link>
        <span className="text-text-tertiary">/</span>
        <span className="text-subhead text-text-primary">{plan.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-title-1 text-text-primary">{plan.name}</h1>
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 text-text-secondary">{plan.status}</span>
      </div>

      <div className="glass-panel p-6">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-subhead text-text-secondary">Plan ID</dt>
            <dd className="mt-0.5 font-mono text-sm text-body text-text-primary">{plan.id}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Status</dt>
            <dd className="mt-0.5 text-body text-text-primary">{plan.status}</dd>
          </div>
          <div>
            <dt className="text-subhead text-text-secondary">Created</dt>
            <dd className="mt-0.5 text-body text-text-primary">{formatDateTime(plan.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
