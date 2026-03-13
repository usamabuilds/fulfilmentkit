'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { POST_AUTH_ROUTES } from '@/lib/utils/postAuthRoute'

export default function OnboardingInvitePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const workspace = useWorkspaceStore((s) => s.workspace)

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }

    if (!workspace) {
      router.replace(POST_AUTH_ROUTES.onboardingWorkspace)
    }
  }, [router, user, workspace])

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-title-2 text-text-primary">Invite your team</h1>
          <p className="text-body text-text-secondary mt-1">
            Step 2 of onboarding: invite teammates now or skip and do it later in settings.
          </p>
        </div>

        <button
          onClick={() => router.push(POST_AUTH_ROUTES.dashboard)}
          className="w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200 bg-accent hover:bg-accent-hover active:scale-[0.98]"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  )
}
