'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiPost } from '@/lib/api/client'
import type { ApiClientError } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'

interface LoginResponse {
  user: {
    id: string
    email: string
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null
  }
  token: string
}

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiPost<LoginResponse>('/auth/login', { email, password })
      setAuth(res.data.user, res.data.token)

      if (res.data.user.onboardingCompleted) {
        router.push('/dashboard')
        return
      }

      router.push('/workspaces')
    } catch (err) {
      if (err instanceof Error) {
        const typedError = err as ApiClientError

        if (typedError.errorCode === 'EMAIL_NOT_VERIFIED') {
          const verifyEmailPath = `/verify-email?email=${encodeURIComponent(email)}`
          router.push(verifyEmailPath)
          return
        }

        setError(typedError.message)
        return
      }

      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-sm p-8">
        <div className="mb-8">
          <div className="w-10 h-10 rounded-[10px] bg-accent flex items-center justify-center mb-4">
            <span className="text-white font-bold text-headline">FK</span>
          </div>
          <h1 className="text-title-2 text-text-primary">Sign in</h1>
          <p className="text-body text-text-secondary mt-1">to FulfilmentKit</p>
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

          {error && <p className="text-footnote text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className={cn(
              'w-full py-2.5 px-4 rounded-[8px] text-callout text-white transition-all duration-200',
              loading || !email || !password
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
