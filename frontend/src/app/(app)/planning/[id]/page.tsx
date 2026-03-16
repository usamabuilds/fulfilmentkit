'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { usePlan } from '@/lib/hooks/usePlanning'
import { formatDateTime } from '@/lib/utils/formatDate'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }


type RiskSeverity = 'low' | 'medium' | 'high'
type RiskTimeToBreak = { label: string; days: number | null; confidence: RiskSeverity }
type PlanTopRisk = {
  title: string
  severity: RiskSeverity
  why: string
  evidence: JsonValue
  timeToBreak: RiskTimeToBreak
}

type PlanOpportunity = {
  title: string
  impact: string
  why: string
  evidenceSummary: string | null
}

type PlanNextDay = {
  day: string
  actions: string[]
  expectedOutcome: string
}

function isRiskSeverity(value: unknown): value is RiskSeverity {
  return value === 'low' || value === 'medium' || value === 'high'
}

function getSeverityBadgeClass(severity: RiskSeverity): string {
  if (severity === 'high') return 'bg-red-500/15 text-red-200 ring-red-500/40'
  if (severity === 'medium') return 'bg-amber-500/15 text-amber-200 ring-amber-500/40'
  return 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/40'
}

function toPlanTopRisk(value: unknown): PlanTopRisk | null {
  const obj = toJsonObject(value)
  if (!obj) return null

  const title = obj.title
  const severity = obj.severity
  const why = obj.why
  const evidence = obj.evidence
  const timeToBreakObj = toJsonObject(obj.timeToBreak)

  if (typeof title !== 'string' || !isRiskSeverity(severity) || typeof why !== 'string' || !timeToBreakObj) {
    return null
  }

  const timeLabel = timeToBreakObj.label
  const timeDays = timeToBreakObj.days
  const timeConfidence = timeToBreakObj.confidence

  const parsedDays = typeof timeDays === 'number' && Number.isFinite(timeDays) ? timeDays : null

  if (typeof timeLabel !== 'string' || !isRiskSeverity(timeConfidence)) {
    return null
  }

  return {
    title,
    severity,
    why,
    evidence: evidence ?? null,
    timeToBreak: {
      label: timeLabel,
      days: parsedDays,
      confidence: timeConfidence,
    },
  }
}

function toPlanOpportunity(value: unknown): PlanOpportunity | null {
  const obj = toJsonObject(value)
  if (!obj) return null

  const title = obj.title
  const impact = obj.impact
  const why = obj.why
  const evidenceObj = toJsonObject(obj.evidence)
  const evidenceSummary = evidenceObj?.summary

  if (typeof title !== 'string' || typeof impact !== 'string' || typeof why !== 'string') {
    return null
  }

  return {
    title,
    impact,
    why,
    evidenceSummary: typeof evidenceSummary === 'string' ? evidenceSummary : null,
  }
}

function renderTopRisks(value: JsonValue): JSX.Element {
  if (!Array.isArray(value)) {
    return renderJsonValue(value)
  }

  const risks = value.map((item) => toPlanTopRisk(item)).filter((item): item is PlanTopRisk => item !== null)

  if (risks.length === 0) {
    return <p className="text-body text-text-secondary">No top risks are available for this plan yet.</p>
  }

  return (
    <div className="space-y-3">
      {risks.map((risk) => (
        <article key={`${risk.title}-${risk.severity}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-subhead text-text-primary">{risk.title}</h4>
            <span className={`rounded-full px-2 py-0.5 text-caption-2 uppercase tracking-wide ring-1 ${getSeverityBadgeClass(risk.severity)}`}>
              {risk.severity}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-caption-2 text-text-secondary ring-1 ring-white/15">
              {risk.timeToBreak.label} · {risk.timeToBreak.confidence} confidence
            </span>
          </div>
          <p className="mt-2 text-body text-text-secondary">{risk.why}</p>
        </article>
      ))}
    </div>
  )
}

function renderOpportunities(value: JsonValue | undefined): JSX.Element {
  if (!value || !Array.isArray(value)) {
    return <p className="text-body text-text-secondary">No opportunities are available for this plan yet.</p>
  }

  const opportunities = value.map((item) => toPlanOpportunity(item)).filter((item): item is PlanOpportunity => item !== null)

  if (opportunities.length === 0) {
    return <p className="text-body text-text-secondary">No opportunities are available for this plan yet.</p>
  }

  return (
    <div className="space-y-3">
      {opportunities.map((opportunity) => (
        <article key={`${opportunity.title}-${opportunity.impact}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-subhead text-text-primary">{opportunity.title}</h4>
            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-caption-2 uppercase tracking-wide text-cyan-200 ring-1 ring-cyan-500/40">
              {opportunity.impact}
            </span>
          </div>
          <p className="mt-2 text-body text-text-secondary">{opportunity.why}</p>
          {opportunity.evidenceSummary ? (
            <p className="mt-2 text-caption-1 text-text-tertiary">Evidence: {opportunity.evidenceSummary}</p>
          ) : null}
        </article>
      ))}
    </div>
  )
}

function toPlanNextDay(value: unknown): PlanNextDay | null {
  const obj = toJsonObject(value)
  if (!obj) return null

  const day = obj.day
  const actions = obj.actions
  const expectedOutcome = obj.expectedOutcome

  if (typeof day !== 'string' || !Array.isArray(actions) || typeof expectedOutcome !== 'string') {
    return null
  }

  const actionList = actions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)

  return {
    day,
    actions: actionList,
    expectedOutcome,
  }
}

function renderNext7DaysPlan(value: JsonValue | undefined): JSX.Element {
  if (!value || !Array.isArray(value)) {
    return <p className="text-body text-text-secondary">No next 7 days plan is available for this plan yet.</p>
  }

  const nextDays = value.map((item) => toPlanNextDay(item)).filter((item): item is PlanNextDay => item !== null)

  if (nextDays.length === 0) {
    return <p className="text-body text-text-secondary">No next 7 days plan is available for this plan yet.</p>
  }

  return (
    <ol className="space-y-4">
      {nextDays.map((entry, index) => (
        <li key={`${entry.day}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-subhead text-text-primary">{entry.day}</h4>
          {entry.actions.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {entry.actions.map((action, actionIndex) => (
                <li key={`${entry.day}-action-${actionIndex}`} className="text-body text-text-primary">
                  {action}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-body text-text-secondary">No actions listed for this day.</p>
          )}
          <p className="mt-3 text-caption-1 text-text-secondary">Expected outcome: {entry.expectedOutcome}</p>
        </li>
      ))}
    </ol>
  )
}

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
  const statusBulletsValue = resultBlocks?.statusBullets
  const statusBullets = Array.isArray(statusBulletsValue)
    ? statusBulletsValue.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : []
  const planOutputBlocks = resultBlocks
    ? Object.entries(resultBlocks).filter(
      ([blockKey]) => blockKey !== 'statusBullets' && blockKey !== 'opportunities' && blockKey !== 'next7DaysPlan',
    )
    : []
  const opportunities = resultBlocks?.opportunities
  const next7DaysPlan = resultBlocks?.next7DaysPlan
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
        <h2 className="text-title-3 text-text-primary">Status bullets</h2>
        <div className="glass-panel p-6">
          {statusBullets.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {statusBullets.map((bullet) => (
                <li key={bullet} className="text-body text-text-primary">
                  {bullet}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-secondary">No status bullets are available for this plan yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-3 text-text-primary">Opportunities</h2>
        <div className="glass-panel p-6">{renderOpportunities(opportunities)}</div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-3 text-text-primary">Next 7 days plan</h2>
        <div className="glass-panel p-6">{renderNext7DaysPlan(next7DaysPlan)}</div>
      </section>

      <section className="space-y-4">
        <h2 className="text-title-3 text-text-primary">Plan output</h2>

        {planOutputBlocks.length > 0 ? (
          <div className="grid gap-4">
            {planOutputBlocks.map(([blockKey, blockValue]) => (
              <article key={blockKey} className="glass-panel p-6">
                <h3 className="text-headline text-text-primary">{formatBlockLabel(blockKey)}</h3>
                <div className="mt-3">{blockKey === 'topRisks' ? renderTopRisks(blockValue) : renderJsonValue(blockValue)}</div>
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
