'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { cn } from '@/lib/utils/cn'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

interface MeResponse {
  user: {
    id: string
    email: string | null
    verified?: boolean | null
    isVerified?: boolean | null
    emailVerified?: boolean | null
    emailVerifiedAt?: string | null
    verifiedAt?: string | null
  } | null
}

interface OnboardingStep {
  label: string
  href: '/onboarding/workspace' | '/onboarding/invite' | '/onboarding/checklist'
}

const onboardingSteps: OnboardingStep[] = [
  { label: 'Workspace', href: '/onboarding/workspace' },
  { label: 'Invite', href: '/onboarding/invite' },
  { label: 'Checklist', href: '/onboarding/checklist' },
]

function isUserVerified(user: MeResponse['user']): boolean {
  if (!user) return false

  return Boolean(
    user.verified ||
      user.isVerified ||
      user.emailVerified ||
      user.emailVerifiedAt ||
      user.verifiedAt
  )
}

function OnboardingProgress() {
  const pathname = usePathname()

  return (
    <nav aria-label="Onboarding progress" className="glass-card p-3">
      <ol className="flex items-center gap-2 md:gap-3">
        {onboardingSteps.map((step, index) => {
          const isActive = pathname === step.href
          const currentIndex = onboardingSteps.findIndex((candidate) => candidate.href === pathname)
          const isCompleted = currentIndex > index

          return (
            <li key={step.href} className="flex items-center gap-2">
              <Link
                href={step.href}
                className={cn(
                  'px-3 py-1.5 rounded-[8px] text-subhead transition-colors duration-200',
                  isActive
                    ? 'nav-pill-active text-text-primary'
                    : isCompleted
                    ? 'bg-accent/20 text-text-primary border border-accent/40'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {index + 1}. {step.label}
              </Link>
              {index < onboardingSteps.length - 1 && <span className="text-text-tertiary text-caption">•</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const router = useRouter()
  const jwt = useAuthStore((state) => state.jwt)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const fallbackPath = useMemo(() => '/login', [])

  useEffect(() => {
    if (!jwt) {
      router.replace(fallbackPath)
      return
    }

    let isCancelled = false

    const validateUser = async () => {
      try {
        const response = await apiGet<MeResponse>('/me')
        if (!response.data.user || !isUserVerified(response.data.user)) {
          if (!isCancelled) {
            router.replace('/workspaces')
          }
          return
        }

        if (!isCancelled) {
          setIsAuthorized(true)
        }
      } catch {
        if (!isCancelled) {
          router.replace(fallbackPath)
        }
      }
    }

    void validateUser()

    return () => {
      isCancelled = true
    }
  }, [fallbackPath, jwt, router])

  if (!isAuthorized) {
    return null
  }

  return (
    <main className="min-h-screen bg-bg-base p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-4">
        <OnboardingProgress />
        <section className="glass-panel p-6 md:p-8">{children}</section>
      </div>
    </main>
  )
}
