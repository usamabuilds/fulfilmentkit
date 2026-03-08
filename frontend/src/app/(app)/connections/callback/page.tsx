'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ConnectionCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/connections')
    }, 2000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass-panel w-full max-w-sm p-8 text-center">
        <p className="text-headline text-text-primary">{error ? 'Connection failed' : 'Connecting…'}</p>
        <p className="mt-2 text-body text-text-secondary">
          {error
            ? 'Something went wrong while connecting. Redirecting you back to connections.'
            : 'Redirecting you back to connections.'}
        </p>
      </div>
    </div>
  )
}

export default function ConnectionCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="glass-panel w-full max-w-sm p-8 text-center">
            <p className="text-headline text-text-primary">Connecting…</p>
            <p className="mt-2 text-body text-text-secondary">Redirecting you back to connections.</p>
          </div>
        </div>
      }
    >
      <ConnectionCallbackContent />
    </Suspense>
  )
}
