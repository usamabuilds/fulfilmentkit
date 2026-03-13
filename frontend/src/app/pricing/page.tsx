'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

type PlanKey = 'starter' | 'pro' | 'enterprise'

interface PlanCard {
  key: PlanKey
  tier: string
  name: string
  price: string
  summary: string
  detail: string
  features: string[]
  exclusions: string
  cta: string
}

const PLANS: PlanCard[] = [
  {
    key: 'starter',
    tier: 'MONITOR',
    name: 'Monitor',
    price: 'Free forever',
    summary: 'For teams establishing a reliable control baseline before complexity expands.',
    detail: 'A real operating product designed to build trust and habit, not a teaser plan.',
    features: [
      '1 workspace, 1 core commerce channel',
      'Up to 500 managed orders/month (hard stop at 500)',
      '2 seats, 1 warehouse / stock location',
      '60 days history',
      'Live order and inventory visibility',
      'Basic backlog + low-stock alerts, basic dashboard, CSV export, limited exception queue',
    ],
    exclusions:
      'Typical upgrade moments: crossing 500 monthly orders, adding a second channel, onboarding more users, adding warehouse complexity, or requiring longer history and deeper analytics.',
    cta: 'Start free with Monitor',
  },
  {
    key: 'pro',
    tier: 'OPERATE',
    name: 'Operate',
    price: '$149/month annual · $179/month monthly',
    summary: 'For operators paying for day-to-day coordination, accountability, and cleaner execution control.',
    detail: 'The easiest paid decision when your operation can no longer run on basic visibility alone.',
    features: [
      'Up to 5,000 managed orders/month',
      'Up to 3 channels, 5 seats, 2 warehouses',
      '12 months history',
      'Standard analytics and alerts',
      'Starter automation included (up to 10,000 executions/month)',
      'Standard connector set, email + chat support',
    ],
    exclusions:
      'Excludes Planning add-on, SSO/SCIM, audit logs, custom SLA, dedicated CSM, multi-entity controls, and specialized enterprise connectors by default.',
    cta: 'Request Operate demo',
  },
  {
    key: 'enterprise',
    tier: 'SCALE',
    name: 'Scale',
    price: '$499/month annual · $599/month monthly',
    summary: 'For serious operators where FulfilmentKit is becoming core system infrastructure.',
    detail: 'Primary mid-market monetization tier for structured growth with stronger operational depth.',
    features: [
      'Up to 20,000 managed orders/month',
      'Up to 8 channels, 15 seats, 5 warehouses',
      '24 months history',
      'Advanced dashboards, analytics, API/webhooks',
      'Role-based permissions + advanced exception workflows',
      'Strong automation included (up to 100,000 executions/month), priority support, 2 premium connectors included',
    ],
    exclusions:
      'Excludes Planning unless purchased separately, plus SSO/SCIM, audit logs, custom SLA, dedicated implementation manager, and multi-entity governance package.',
    cta: 'Request Scale demo',
  },
]

export default function PricingPage() {
  const router = useRouter()

  function handleGetStarted(plan: PlanKey) {
    router.push(`/register?plan=${plan}`)
  }

  return (
    <main className="min-h-screen bg-bg-base px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-title-2 text-text-primary sm:text-title-1">Core plans: Monitor, Operate, Scale</h1>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article key={plan.key} className="glass-card flex h-full flex-col p-6">
              <p className="text-caption-2 text-text-tertiary">{plan.tier}</p>
              <h2 className="mt-1 text-title-3 text-text-primary">{plan.price}</h2>
              <p className="mt-3 text-body text-text-secondary">{plan.summary}</p>
              <p className="mt-3 text-body text-text-secondary">{plan.detail}</p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-body text-text-secondary">
                    • {feature}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-body text-text-secondary">{plan.exclusions}</p>

              <button
                type="button"
                onClick={() => handleGetStarted(plan.key)}
                className={cn(
                  'mt-6 inline-flex w-fit items-center justify-center rounded-full px-5 py-2.5 text-callout font-medium transition-all duration-200 active:scale-[0.98] shadow-sm',
                  plan.key === 'pro'
                    ? 'bg-accent text-text-inverse hover:bg-accent-hover'
                    : 'border border-border-default bg-white/65 text-text-primary hover:bg-white/80'
                )}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
