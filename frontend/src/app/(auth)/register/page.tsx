'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiPost } from '@/lib/api/client'

type PlanKey = 'starter' | 'pro' | 'enterprise'

interface RegisterResponse {
  verificationRequired: boolean
  user: {
    id: string
    email: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null
  }
}

function isPlan(value: string | null): value is PlanKey {
  return value === 'starter' || value === 'pro' || value === 'enterprise'
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPlan = searchParams.get('plan')
  const selectedPlan = useMemo<PlanKey>(() => (isPlan(initialPlan) ? initialPlan : 'starter'), [initialPlan])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await apiPost<RegisterResponse>('/auth/register', {
        email,
        password,
        plan: selectedPlan,
      })

      const params = new URLSearchParams({
        email,
        plan: selectedPlan,
      })
      router.push(`/verify-email?${params.toString()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || !email || !password || !confirmPassword

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-8">
          <p className="text-caption-2 text-accent">{selectedPlan.toUpperCase()} PLAN</p>
          <h1 className="text-title-2 text-text-primary mt-2">Create your account</h1>
          <p className="text-body text-text-secondary mt-1">Start your FulfilmentKit trial.</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            className="glass-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="glass-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="glass-input"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="text-footnote text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleRegister}
            disabled={isDisabled}
            className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-callout text-white transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-accent/50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <RegisterForm />
    </Suspense>
  )
}
