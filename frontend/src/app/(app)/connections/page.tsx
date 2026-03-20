'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConnectionCard } from '@/components/modules/connections/ConnectionCard'
import {
  connectionPlatforms,
  type Connection,
  type ConnectionPlatform,
  type StartConnectionResult,
  type StartConnectionInstructionsResult,
} from '@/lib/api/endpoints/connections'
import { useConnections, useStartConnection, useStartSync } from '@/lib/hooks/useConnections'
import { cn } from '@/lib/utils/cn'

interface ConnectPlatformCardProps {
  platform: ConnectionPlatform
  statusLabel?: string
  helperText?: string
  isHighlighted?: boolean
  onStartSuccess: (platform: ConnectionPlatform, result: StartConnectionResult) => void
}

function toPlatformLabel(platform: ConnectionPlatform): string {
  if (platform === 'quickbooks') return 'QuickBooks'
  if (platform === 'woocommerce') return 'WooCommerce'

  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

function isConnectedStatus(status: Connection['status']): boolean {
  return status === 'active' || status === 'error'
}

function ConnectPlatformCard({
  platform,
  statusLabel,
  helperText,
  isHighlighted = false,
  onStartSuccess,
}: ConnectPlatformCardProps) {
  const { mutate, isPending, isError, error } = useStartConnection(platform)

  const label = toPlatformLabel(platform)

  return (
    <div
      className={cn(
        'glass-panel flex items-center justify-between gap-4 p-5',
        isHighlighted ? 'ring-2 ring-accent/60' : ''
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-headline text-text-primary">{label}</span>
          {statusLabel ? (
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-caption-2 text-text-secondary">
              {statusLabel}
            </span>
          ) : null}
        </div>
        <p className="text-footnote text-text-tertiary">
          {helperText ?? 'Connect this platform to start syncing data.'}
        </p>
        {isError ? (
          <p className="text-footnote text-destructive">
            {error instanceof Error ? error.message : 'Unable to start connection.'}
          </p>
        ) : null}
      </div>

      <button
        onClick={() => mutate(undefined, { onSuccess: (response) => onStartSuccess(platform, response.data) })}
        disabled={isPending}
        className={cn(
          'rounded-[8px] px-4 py-2 text-subhead transition-all duration-200',
          isPending
            ? 'cursor-not-allowed bg-accent/40 text-white'
            : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
        )}
      >
        {isPending ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}

function ConnectionItem({ connection }: { connection: Connection }) {
  const { mutate, isPending } = useStartSync(connection.id)

  return <ConnectionCard connection={connection} onSync={() => mutate()} syncing={isPending} />
}

function toValidPlatform(input: string | null): ConnectionPlatform | null {
  if (!input) return null

  const normalized = input.trim().toLowerCase()

  if (!normalized) return null

  return connectionPlatforms.find((platform) => platform === normalized) ?? null
}

export default function ConnectionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, isLoading } = useConnections()
  const [instructionResult, setInstructionResult] = useState<{
    platform: ConnectionPlatform
    instructions: StartConnectionInstructionsResult
  } | null>(null)
  const requestedPlatform = searchParams.get('platform')
  const selectedPlatform = toValidPlatform(requestedPlatform)
  const { mutate: startSelectedPlatform, isPending: isStartingSelectedPlatform } = useStartConnection(
    selectedPlatform ?? 'shopify'
  )

  const connections = data?.data?.items ?? []

  const { connectedConnections, disconnectedConnections, missingPlatforms } = useMemo(() => {
    const connected = connections.filter((connection) => isConnectedStatus(connection.status))
    const disconnected = connections.filter((connection) => !isConnectedStatus(connection.status))
    const connectedPlatformSet = new Set(connections.map((connection) => connection.platform))
    const missing = connectionPlatforms.filter((platform) => !connectedPlatformSet.has(platform))

    return {
      connectedConnections: connected,
      disconnectedConnections: disconnected,
      missingPlatforms: missing,
    }
  }, [connections])

  const handleStartSuccess = (platform: ConnectionPlatform, result: StartConnectionResult) => {
    if (result.type === 'auth_url') {
      window.location.assign(result.url)
      return
    }

    setInstructionResult({
      platform,
      instructions: {
        ...result,
        steps: Array.isArray(result.steps) ? result.steps : [],
      },
    })
  }

  const clearPlatformQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('platform')
    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname

    router.replace(nextUrl)
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (requestedPlatform && !selectedPlatform) {
      clearPlatformQuery()
    }
  }, [clearPlatformQuery, requestedPlatform, selectedPlatform])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Connections</h1>
        <p className="mt-1 text-body text-text-secondary">Manage your platform integrations.</p>
      </div>

      {instructionResult ? (
        <div className="glass-panel flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-headline text-text-primary">{instructionResult.instructions.title}</h2>
            <button
              onClick={() => setInstructionResult(null)}
              className="rounded-[8px] bg-black/5 px-3 py-1.5 text-footnote text-text-secondary transition-colors hover:bg-black/10"
            >
              Dismiss
            </button>
          </div>

          <p className="text-footnote text-text-tertiary">
            {instructionResult.instructions.message ??
              `Complete these steps to finish connecting ${toPlatformLabel(instructionResult.platform)}.`}
          </p>

          <ol className="list-decimal space-y-1 pl-5 text-footnote text-text-secondary">
            {instructionResult.instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {selectedPlatform ? (
        <div className="glass-panel flex items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-subhead text-text-primary">
              Ready to connect {toPlatformLabel(selectedPlatform)}?
            </h2>
            <p className="text-footnote text-text-tertiary">
              Continue to start the {toPlatformLabel(selectedPlatform)} connection flow.
            </p>
          </div>

          <button
            onClick={() =>
              startSelectedPlatform(undefined, {
                onSuccess: (response) => handleStartSuccess(selectedPlatform, response.data),
                onSettled: () => clearPlatformQuery(),
              })
            }
            disabled={isStartingSelectedPlatform}
            className={cn(
              'rounded-[8px] px-4 py-2 text-subhead transition-all duration-200',
              isStartingSelectedPlatform
                ? 'cursor-not-allowed bg-accent/40 text-white'
                : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {isStartingSelectedPlatform ? 'Connecting…' : `Connect ${toPlatformLabel(selectedPlatform)}`}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-20" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {connections.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <p className="text-body text-text-secondary">No connections yet.</p>
              <p className="mt-1 text-footnote text-text-tertiary">Connect a platform to start syncing data.</p>
            </div>
          ) : null}

          {disconnectedConnections.map((connection) => (
            <ConnectPlatformCard
              key={connection.id}
              platform={connection.platform}
              statusLabel={connection.status}
              helperText="This connection is disconnected. Reconnect to resume syncing."
              isHighlighted={connection.platform === selectedPlatform}
              onStartSuccess={(platform, result) => {
                handleStartSuccess(platform, result)
                if (platform === selectedPlatform) {
                  clearPlatformQuery()
                }
              }}
            />
          ))}

          {connectedConnections.map((connection) => (
            <ConnectionItem key={connection.id} connection={connection} />
          ))}

          {missingPlatforms.map((platform) => (
            <ConnectPlatformCard
              key={platform}
              platform={platform}
              isHighlighted={platform === selectedPlatform}
              onStartSuccess={(startedPlatform, result) => {
                handleStartSuccess(startedPlatform, result)
                if (startedPlatform === selectedPlatform) {
                  clearPlatformQuery()
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
