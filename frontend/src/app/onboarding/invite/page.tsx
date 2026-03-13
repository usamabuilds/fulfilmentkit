import Link from 'next/link'

export default function OnboardingInvitePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-caption-2 text-text-tertiary">Step 2</p>
        <h1 className="text-title-2 text-text-primary">Invite your team</h1>
        <p className="text-body text-text-secondary">
          Add teammates so everyone can collaborate on inventory, orders, and forecasting.
        </p>
      </header>

      <div className="glass-card p-4 space-y-3">
        <p className="text-subhead text-text-secondary">Team invitations will be configured in this step.</p>
      </div>

      <div className="flex justify-between">
        <Link
          href="/onboarding/workspace"
          className="px-4 py-2 rounded-[8px] text-callout text-text-primary border border-border-default hover:bg-black/5 transition-colors duration-200"
        >
          Back
        </Link>
        <Link
          href="/onboarding/checklist"
          className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover transition-colors duration-200"
        >
          Continue
        </Link>
      </div>
    </div>
  )
}
