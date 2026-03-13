import Link from 'next/link'

export default function OnboardingChecklistPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-caption-2 text-text-tertiary">Step 3</p>
        <h1 className="text-title-2 text-text-primary">Complete your checklist</h1>
        <p className="text-body text-text-secondary">
          Review key setup tasks so your workspace is ready for day-one operations.
        </p>
      </header>

      <ul className="glass-card p-4 space-y-3 text-subhead text-text-secondary">
        <li>• Connect your first sales channel</li>
        <li>• Add inventory sources</li>
        <li>• Set your default planning cadence</li>
      </ul>

      <div className="flex justify-between">
        <Link
          href="/onboarding/invite"
          className="px-4 py-2 rounded-[8px] text-callout text-text-primary border border-border-default hover:bg-black/5 transition-colors duration-200"
        >
          Back
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover transition-colors duration-200"
        >
          Finish onboarding
        </Link>
      </div>
    </div>
  )
}
