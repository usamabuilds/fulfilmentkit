import Link from 'next/link'

export default function OnboardingWorkspacePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-caption-2 text-text-tertiary">Step 1</p>
        <h1 className="text-title-2 text-text-primary">Set up your workspace</h1>
        <p className="text-body text-text-secondary">
          Choose a workspace name and configure your preferences to personalize FulfilmentKit.
        </p>
      </header>

      <div className="glass-card p-4 space-y-3">
        <p className="text-subhead text-text-secondary">Workspace details will be added in this step.</p>
      </div>

      <div className="flex justify-end">
        <Link
          href="/onboarding/invite"
          className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover transition-colors duration-200"
        >
          Continue
        </Link>
      </div>
    </div>
  )
}
