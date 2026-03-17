'use client'

import Link from 'next/link'
import { usePlans } from '@/lib/hooks/usePlanning'
import { formatDate } from '@/lib/utils/formatDate'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

function toJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as JsonObject
}

function getNestedJsonValue(source: JsonObject | null, path: readonly string[]): JsonValue | null {
  if (!source || path.length === 0) {
    return null
  }

  let current: JsonValue = source

  for (const segment of path) {
    const currentObject = toJsonObject(current)
    if (!currentObject) {
      return null
    }

    const next = currentObject[segment]
    if (next === undefined || next === null) {
      return null
    }

    current = next
  }

  return current
}

function toFiniteNumber(value: JsonValue | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getHorizonDays(result: Record<string, unknown> | null): number | null {
  const resultObject = toJsonObject(result)

  const explicitHorizonPaths: ReadonlyArray<readonly string[]> = [
    ['horizonDays'],
    ['horizon_days'],
    ['summary', 'horizonDays'],
    ['summary', 'horizon_days'],
    ['metadata', 'horizonDays'],
  ]

  for (const path of explicitHorizonPaths) {
    const horizon = toFiniteNumber(getNestedJsonValue(resultObject, path))
    if (horizon !== null) {
      return horizon
    }
  }

  const stockoutEvidencePaths: ReadonlyArray<readonly string[]> = [
    ['stockoutEvidence', 'horizonDays'],
    ['stockoutEvidence', 'daysUntilStockout'],
    ['stockoutEvidence', 'timeToStockoutDays'],
    ['evidence', 'stockout', 'horizonDays'],
    ['evidence', 'stockout', 'daysUntilStockout'],
  ]

  for (const path of stockoutEvidencePaths) {
    const horizon = toFiniteNumber(getNestedJsonValue(resultObject, path))
    if (horizon !== null) {
      return horizon
    }
  }

  const topRisks = getNestedJsonValue(resultObject, ['topRisks'])
  if (Array.isArray(topRisks)) {
    for (const risk of topRisks) {
      const riskObject = toJsonObject(risk)
      if (!riskObject) {
        continue
      }

      const title = getNestedJsonValue(riskObject, ['title'])
      const isStockoutRisk = typeof title === 'string' && title.toLowerCase().includes('stockout')
      if (!isStockoutRisk) {
        continue
      }

      const timeToBreakDays = toFiniteNumber(getNestedJsonValue(riskObject, ['timeToBreak', 'days']))
      if (timeToBreakDays !== null) {
        return timeToBreakDays
      }
    }
  }

  // TODO(backend): expose stable `horizonDays` in `/plans` list responses to avoid result-shape parsing variance.
  return null
}

function formatHorizonLabel(days: number | null): string {
  return days === null ? 'Horizon: N/A' : `Horizon: ${days} days`
}

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
          {plans.map((plan) => {
            const horizonDays = getHorizonDays(plan.result)

            return (
              <Link key={plan.id} href={`/planning/${plan.id}`}>
                <div className="glass-card flex items-center justify-between p-5">
                  <div>
                    <p className="text-headline text-text-primary">{plan.title ?? 'Untitled plan'}</p>
                    <p className="mt-0.5 text-footnote text-text-tertiary">{formatDate(plan.createdAt)}</p>
                    <p className="mt-0.5 text-footnote text-text-secondary">{formatHorizonLabel(horizonDays)}</p>
                  </div>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 text-text-secondary">{plan.status}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
