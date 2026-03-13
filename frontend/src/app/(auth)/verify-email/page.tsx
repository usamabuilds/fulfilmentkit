'use client'

import { FormEvent, KeyboardEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiPost } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'

interface VerifyEmailResponse {
  user: {
    id: string
    email: string | null
    emailVerified: boolean
    onboardingCompleted: boolean
    nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null
  }
  token: string
}

interface ResendResponse {
  sent: boolean
}

function parseCooldownSeconds(message: string): number | null {
  const match = message.match(/(\d+)\s*(s|sec|secs|second|seconds)/i)
  if (!match) return null
  const seconds = Number(match[1])
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}


function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)

  const email = searchParams.get('email') ?? ''
  const digitsLength = 6

  const [digits, setDigits] = useState<string[]>(Array.from({ length: digitsLength }, () => ''))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const code = useMemo(() => digits.join(''), [digits])

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = window.setInterval(() => {
      setCooldownSeconds((previous) => (previous > 0 ? previous - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownSeconds])

  function updateDigit(index: number, value: string) {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    setDigits((previous) => {
      const next = [...previous]
      next[index] = nextValue
      return next
    })

    if (nextValue && index < digitsLength - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(value: string) {
    const numeric = value.replace(/\D/g, '').slice(0, digitsLength)
    if (!numeric) return

    setDigits((previous) => {
      const next = [...previous]
      for (let i = 0; i < digitsLength; i += 1) {
        next[i] = numeric[i] ?? ''
      }
      return next
    })

    const focusIndex = Math.min(numeric.length, digitsLength - 1)
    inputRefs.current[focusIndex]?.focus()
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email) {
      setError('Missing email context. Please register again.')
      return
    }

    if (code.length !== digitsLength) {
      setError('Enter the 6-digit verification code.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await apiPost<VerifyEmailResponse>('/auth/verify-email', {
        email,
        code,
      })
      setAuth(
        {
          id: res.data.user.id,
          email: res.data.user.email ?? '',
          emailVerified: res.data.user.emailVerified,
          onboardingCompleted: res.data.user.onboardingCompleted,
          nextOnboardingStep: res.data.user.nextOnboardingStep,
        },
        res.data.token
      )
      router.push('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email || cooldownSeconds > 0) return

    setResendLoading(true)
    setError(null)

    try {
      await apiPost<ResendResponse>('/auth/resend-code', { email })
      setCooldownSeconds(60)
    } catch (err) {
      if (err instanceof Error) {
        const parsed = parseCooldownSeconds(err.message)
        if (parsed !== null) {
          setCooldownSeconds(parsed)
        } else {
          setCooldownSeconds(60)
        }
        setError(err.message)
      } else {
        setCooldownSeconds(60)
        setError('Unable to resend code right now.')
      }
    } finally {
      setResendLoading(false)
    }
  }

  const resendDisabled = resendLoading || cooldownSeconds > 0 || !email

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8">
        <div className="mb-6">
          <p className="text-caption-2 text-accent">VERIFY EMAIL</p>
          <h1 className="mt-2 text-title-2 text-text-primary">Check your inbox</h1>
          <p className="mt-1 text-body text-text-secondary">
            Enter the 6-digit code sent to {email || 'your email'}.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleVerify}>
          <div className="flex items-center justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={`digit-${index}`}
                ref={(element) => {
                  inputRefs.current[index] = element
                }}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={(event) => {
                  event.preventDefault()
                  handlePaste(event.clipboardData.getData('text'))
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="glass-input h-12 w-12 p-0 text-center text-headline"
                aria-label={`Verification code digit ${index + 1}`}
              />
            ))}
          </div>

          {error && <p className="text-footnote text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== digitsLength}
            className="w-full rounded-[8px] bg-accent px-4 py-2.5 text-callout text-white transition-all duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-accent/50"
          >
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-footnote text-text-secondary">Didn’t get the code?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendDisabled}
            className="text-footnote text-accent transition-colors hover:text-accent-hover disabled:cursor-not-allowed disabled:text-text-tertiary"
          >
            {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : resendLoading ? 'Resending…' : 'Resend'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <VerifyEmailForm />
    </Suspense>
  )
}
