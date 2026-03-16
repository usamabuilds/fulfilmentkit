'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlanning'
import { formatDateTime } from '@/lib/utils/formatDate'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

function toJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as JsonObject
}

function formatBlockLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}

function renderJsonValue(value: JsonValue): JSX.Element {
  if (value === null) {
    return <p className="text-body text-text-secondary">No data provided.</p>
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <p className="text-body text-text-primary">{String(value)}</p>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-body text-text-secondary">No entries.</p>
    }

    return (
      <ul className="list-disc space-y-2 pl-5">
        {value.map((item, index) => (
          <li key={`${index}-${JSON.stringify(item)}`} className="text-body text-text-primary">
            {renderJsonValue(item)}
          </li>
        ))}
      </ul>
    )
  }

  const entries = Object.entries(value)
  if (entries.length === 0) {
    return <p className="text-body text-text-secondary">No fields provided.</p>
  }

  return (
    <dl className="space-y-3">
      {entries.map(([entryKey, entryValue]) => (
        <div key={entryKey}>
          <dt className="text-subhead text-text-secondary">{formatBlockLabel(entryKey)}</dt>
          <dd className="mt-1">{renderJsonValue(entryValue)}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = usePlan(id)
  const plan = data?.data
  const planName = plan?.title ?? plan?.name ?? 'Untitled plan'
  const resultBlocks = toJsonObject(plan?.result)
  const assumptions = toJsonObject(plan?.assumptions)

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
        <span className="text-subhead text-text-primary">{planName}</span>
      </div>

      <div className="flex items-start justify-between">
        <h1 className="text-title-1 text-text-primary">{planName}</h1>
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

      <section className="space-y-4">
        <h2 className="text-title-3 text-text-primary">Plan output</h2>

        {resultBlocks && Object.keys(resultBlocks).length > 0 ? (
          <div className="grid gap-4">
            {Object.entries(resultBlocks).map(([blockKey, blockValue]) => (
              <article key={blockKey} className="glass-panel p-6">
                <h3 className="text-headline text-text-primary">{formatBlockLabel(blockKey)}</h3>
                <div className="mt-3">{renderJsonValue(blockValue)}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6">
            <p className="text-body text-text-secondary">No structured output is available for this plan yet.</p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-title-3 text-text-primary">Assumptions</h2>
        <div className="glass-panel p-6">
          {assumptions ? (
            renderJsonValue(assumptions)
          ) : (
            <p className="text-body text-text-secondary">No assumptions were provided for this plan.</p>
          )}
        </div>
      </section>
    </div>
  )
}
