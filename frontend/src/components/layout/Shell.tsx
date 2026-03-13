'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TopNav } from './TopNav'
import { LeftSidebar } from './RightSidebar'
import { modules } from '@/lib/nav/modules'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { apiGet } from '@/lib/api/client'

interface ShellProps {
  children: React.ReactNode
}

type AuthValidationState = 'loading' | 'valid' | 'invalid'

interface MeResponse {
  user: {
    id: string
    email: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null
  } | null
  workspaceId: string | null
  workspaceRole: string | null
}

export function Shell({ children }: ShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authValidationState, setAuthValidationState] = useState<AuthValidationState>('loading')
  const [validationKey, setValidationKey] = useState(0)
  const jwt = useAuthStore((s) => s.jwt)
  const user = useAuthStore((s) => s.user)
  const workspace = useWorkspaceStore((s) => s.workspace)
  const setAuth = useAuthStore((s) => s.setAuth)
  const activeModule = modules.find((m) => pathname.startsWith(m.basePath))

  useEffect(() => {
    if (!jwt) {
      setAuthValidationState('invalid')
      router.replace('/login')
      return
    }

    if (!workspace) {
      setAuthValidationState('invalid')
      router.replace('/workspaces')
      return
    }

    let cancelled = false

    const validateSession = async () => {
      setAuthValidationState('loading')

      try {
        const res = await apiGet<MeResponse>('/me')
        const validatedUser = res.data.user
        const validatedWorkspaceId = res.data.workspaceId
        const validatedWorkspaceRole = res.data.workspaceRole

        if (!validatedUser || !validatedWorkspaceId || !validatedWorkspaceRole) {
          if (!cancelled) {
            setAuthValidationState('invalid')
            router.replace('/login')
          }
          return
        }

        if (!validatedUser.onboardingCompleted) {
          if (!cancelled) {
            setAuthValidationState('invalid')
            router.replace('/workspaces')
          }
          return
        }

        setAuth(
          {
            id: validatedUser.id,
            email: validatedUser.email ?? user?.email ?? '',
            emailVerified: validatedUser.emailVerified,
            onboardingCompleted: validatedUser.onboardingCompleted,
            nextOnboardingStep: validatedUser.nextOnboardingStep,
          },
          jwt
        )

        if (!cancelled) {
          setAuthValidationState('valid')
        }
      } catch {
        if (!cancelled) {
          setAuthValidationState('invalid')
        }
      }
    }

    void validateSession()

    return () => {
      cancelled = true
    }
  }, [jwt, router, setAuth, user?.email, validationKey, workspace])

  useEffect(() => {
    const unsubscribeAuth = useAuthStore.subscribe((state) => {
      if (!state.jwt) {
        setValidationKey((prev) => prev + 1)
      }
    })

    const unsubscribeWorkspace = useWorkspaceStore.subscribe((state) => {
      if (!state.workspace) {
        setValidationKey((prev) => prev + 1)
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeWorkspace()
    }
  }, [])

  if (authValidationState !== 'valid') return null

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="px-4 pt-3">
        <TopNav />
      </div>
      <LeftSidebar />

      {activeModule && activeModule.pages.length > 1 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="w-10 h-10 rounded-full bg-accent text-white text-headline flex items-center justify-center shadow-lg"
          >
            ≡
          </button>
          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-12 right-0 glass-overlay p-3 min-w-[160px]"
              >
                <p className="text-caption-2 text-text-tertiary px-2 mb-2">
                  {activeModule.label.toUpperCase()}
                </p>
                {activeModule.pages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'block px-3 py-2 rounded-[8px] text-subhead transition-colors duration-200',
                      pathname === page.href
                        ? 'nav-pill-active text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-black/5'
                    )}
                  >
                    {page.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <main className="pt-16 lg:pl-[216px]">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
