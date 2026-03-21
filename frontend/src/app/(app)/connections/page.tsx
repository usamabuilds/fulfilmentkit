'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ConnectionCard } from '@/components/modules/connections/ConnectionCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  connectionPlatforms,
  type Connection,
  type ConnectionPlatform,
  type StartConnectionResult,
  type StartConnectionInstructionsResult,
} from '@/lib/api/endpoints/connections'
import {
  useCompleteConnection,
  useConnections,
  useStartConnection,
  useStartSync,
} from '@/lib/hooks/useConnections'
import { cn } from '@/lib/utils/cn'
import { toPlatformLabel } from '@/lib/utils/platformLabel'

interface ConnectPlatformCardProps {
  platform: ConnectionPlatform
  statusLabel?: string
  helperText?: string
  isHighlighted?: boolean
  onStartSuccess: (platform: ConnectionPlatform, result: StartConnectionResult) => void
  onConnectionCompleted?: (platform: ConnectionPlatform) => void
}

interface ShopifyStoreModalProps {
  open: boolean
  isSubmitting: boolean
  platformLabel: string
  startError?: string
  onClose: () => void
  onSubmit: (shop: string) => void
}

interface WooCommerceCredentialsModalProps {
  open: boolean
  isSubmitting: boolean
  platformLabel: string
  submitError?: string
  onClose: () => void
  onSubmit: (payload: {
    storeUrl: string
    consumerKey: string
    consumerSecret: string
  }) => void
}

const SHOPIFY_STORE_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/i

function isConnectedStatus(status: Connection['status']): boolean {
  const normalizedStatus = status.toLowerCase()

  return normalizedStatus === 'active' || normalizedStatus === 'error'
}

function normalizeShopDomain(input: string): string {
  const trimmed = input.trim().toLowerCase()
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '')

  return withoutProtocol.replace(/\/$/, '')
}

function getShopDomainError(input: string): string | null {
  const normalized = normalizeShopDomain(input)

  if (!normalized) {
    return 'Store URL is required.'
  }

  if (!SHOPIFY_STORE_REGEX.test(normalized)) {
    return 'Enter a valid Shopify store URL, like mystore.myshopify.com.'
  }

  return null
}

function normalizeWooCommerceStoreUrl(input: string): string {
  const trimmedStoreUrl = input.trim()
  const storeUrlWithProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedStoreUrl)
    ? trimmedStoreUrl
    : `https://${trimmedStoreUrl}`
  const parsedStoreUrl = new URL(storeUrlWithProtocol)

  parsedStoreUrl.pathname = parsedStoreUrl.pathname.replace(/\/+$/, '')
  parsedStoreUrl.search = ''
  parsedStoreUrl.hash = ''

  return parsedStoreUrl.toString().replace(/\/$/, '')
}

function getWooCommerceStoreUrlError(input: string): string | null {
  if (!input.trim()) {
    return 'Store URL is required.'
  }

  try {
    normalizeWooCommerceStoreUrl(input)
  } catch {
    return 'Enter a valid store URL.'
  }

  return null
}

function getRequiredFieldError(input: string, label: string): string | null {
  return input.trim() ? null : `${label} is required.`
}

function requiresCredentialModal(platform: ConnectionPlatform): boolean {
  return platform === 'shopify' || platform === 'woocommerce'
}

function ShopifyStoreModal({
  open,
  isSubmitting,
  platformLabel,
  startError,
  onClose,
  onSubmit,
}: ShopifyStoreModalProps) {
  const [shopInput, setShopInput] = useState('')
  const [isTouched, setIsTouched] = useState(false)

  useEffect(() => {
    if (!open) {
      setShopInput('')
      setIsTouched(false)
    }
  }, [open])

  const validationError = getShopDomainError(shopInput)
  const shouldShowError = isTouched && validationError !== null
  const panelErrorMessage = shouldShowError ? validationError : startError

  const handleContinue = () => {
    setIsTouched(true)
    if (validationError) {
      return
    }

    onSubmit(normalizeShopDomain(shopInput))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Connect ${platformLabel}`}
      description="Enter your Shopify store URL to continue the connection flow."
    >
      <div className="flex flex-col gap-4">
        <Input
          value={shopInput}
          onChange={(event) => setShopInput(event.target.value)}
          onBlur={() => setIsTouched(true)}
          placeholder="mystore.myshopify.com"
          label="Store URL"
          autoComplete="off"
          spellCheck={false}
          error={shouldShowError ? validationError ?? undefined : undefined}
          disabled={isSubmitting}
        />
        {panelErrorMessage ? (
          <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-footnote text-destructive">
            {panelErrorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleContinue} loading={isSubmitting}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function WooCommerceCredentialsModal({
  open,
  isSubmitting,
  platformLabel,
  submitError,
  onClose,
  onSubmit,
}: WooCommerceCredentialsModalProps) {
  const [storeUrl, setStoreUrl] = useState('')
  const [consumerKey, setConsumerKey] = useState('')
  const [consumerSecret, setConsumerSecret] = useState('')
  const [touchedFields, setTouchedFields] = useState<{
    storeUrl: boolean
    consumerKey: boolean
    consumerSecret: boolean
  }>({
    storeUrl: false,
    consumerKey: false,
    consumerSecret: false,
  })

  useEffect(() => {
    if (!open) {
      setStoreUrl('')
      setConsumerKey('')
      setConsumerSecret('')
      setTouchedFields({
        storeUrl: false,
        consumerKey: false,
        consumerSecret: false,
      })
    }
  }, [open])

  const storeUrlError = getWooCommerceStoreUrlError(storeUrl)
  const consumerKeyError = getRequiredFieldError(consumerKey, 'Consumer Key')
  const consumerSecretError = getRequiredFieldError(consumerSecret, 'Consumer Secret')
  const hasValidationError = !!storeUrlError || !!consumerKeyError || !!consumerSecretError
  const shouldShowValidationPanelError =
    (touchedFields.storeUrl && !!storeUrlError) ||
    (touchedFields.consumerKey && !!consumerKeyError) ||
    (touchedFields.consumerSecret && !!consumerSecretError)
  const panelErrorMessage = shouldShowValidationPanelError
    ? storeUrlError ?? consumerKeyError ?? consumerSecretError
    : submitError

  const handleContinue = () => {
    setTouchedFields({
      storeUrl: true,
      consumerKey: true,
      consumerSecret: true,
    })

    if (hasValidationError) {
      return
    }

    onSubmit({
      storeUrl: normalizeWooCommerceStoreUrl(storeUrl),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Connect ${platformLabel}`}
      description="Enter your WooCommerce API credentials to complete the connection."
    >
      <div className="flex flex-col gap-4">
        <Input
          value={storeUrl}
          onChange={(event) => setStoreUrl(event.target.value)}
          onBlur={() => setTouchedFields((previous) => ({ ...previous, storeUrl: true }))}
          placeholder="https://example.com"
          label="Store URL"
          autoComplete="off"
          spellCheck={false}
          error={touchedFields.storeUrl ? storeUrlError ?? undefined : undefined}
          disabled={isSubmitting}
        />
        <Input
          value={consumerKey}
          onChange={(event) => setConsumerKey(event.target.value)}
          onBlur={() => setTouchedFields((previous) => ({ ...previous, consumerKey: true }))}
          label="Consumer Key"
          autoComplete="off"
          spellCheck={false}
          error={touchedFields.consumerKey ? consumerKeyError ?? undefined : undefined}
          disabled={isSubmitting}
        />
        <Input
          value={consumerSecret}
          onChange={(event) => setConsumerSecret(event.target.value)}
          onBlur={() => setTouchedFields((previous) => ({ ...previous, consumerSecret: true }))}
          label="Consumer Secret"
          autoComplete="off"
          spellCheck={false}
          error={touchedFields.consumerSecret ? consumerSecretError ?? undefined : undefined}
          disabled={isSubmitting}
        />
        {panelErrorMessage ? (
          <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-footnote text-destructive">
            {panelErrorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleContinue} loading={isSubmitting}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ConnectPlatformCard({
  platform,
  statusLabel,
  helperText,
  isHighlighted = false,
  onStartSuccess,
  onConnectionCompleted,
}: ConnectPlatformCardProps) {
  const { mutate, isPending, isError, error } = useStartConnection(platform)
  const {
    mutate: completeWooCommerceConnection,
    isPending: isCompletingWooCommerceConnection,
    isError: isCompleteWooCommerceError,
    error: completeWooCommerceError,
  } = useCompleteConnection('woocommerce')
  const [shopifyModalOpen, setShopifyModalOpen] = useState(false)
  const [wooCommerceModalOpen, setWooCommerceModalOpen] = useState(false)

  const label = toPlatformLabel(platform)

  const handleStart = () => {
    if (platform === 'shopify') {
      setShopifyModalOpen(true)
      return
    }
    if (platform === 'woocommerce') {
      setWooCommerceModalOpen(true)
      return
    }

    mutate(undefined, {
      onSuccess: (response) => onStartSuccess(platform, response.data),
    })
  }

  const handleShopifySubmit = (shop: string) => {
    mutate(
      { shop },
      {
        onSuccess: (response) => {
          setShopifyModalOpen(false)
          onStartSuccess(platform, response.data)
        },
      }
    )
  }

  const handleWooCommerceSubmit = (payload: {
    storeUrl: string
    consumerKey: string
    consumerSecret: string
  }) => {
    completeWooCommerceConnection(payload, {
      onSuccess: () => {
        setWooCommerceModalOpen(false)
        onConnectionCompleted?.(platform)
      },
    })
  }

  const isConnecting = isPending || isCompletingWooCommerceConnection

  return (
    <>
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
          onClick={handleStart}
          disabled={isConnecting}
          className={cn(
            'rounded-[8px] px-4 py-2 text-subhead transition-all duration-200',
            isConnecting
              ? 'cursor-not-allowed bg-accent/40 text-white'
              : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
          )}
        >
          {isConnecting ? 'Connecting…' : 'Connect'}
        </button>
      </div>

      <ShopifyStoreModal
        open={shopifyModalOpen}
        isSubmitting={isPending}
        platformLabel={label}
        startError={
          shopifyModalOpen && isError
            ? error instanceof Error
              ? error.message
              : 'Unable to start connection.'
            : undefined
        }
        onClose={() => setShopifyModalOpen(false)}
        onSubmit={handleShopifySubmit}
      />

      <WooCommerceCredentialsModal
        open={wooCommerceModalOpen}
        isSubmitting={isCompletingWooCommerceConnection}
        platformLabel={label}
        submitError={
          wooCommerceModalOpen && isCompleteWooCommerceError
            ? completeWooCommerceError instanceof Error
              ? completeWooCommerceError.message
              : 'Unable to complete connection.'
            : undefined
        }
        onClose={() => setWooCommerceModalOpen(false)}
        onSubmit={handleWooCommerceSubmit}
      />
    </>
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
  const [isSelectedShopifyModalOpen, setIsSelectedShopifyModalOpen] = useState(false)
  const [isSelectedWooCommerceModalOpen, setIsSelectedWooCommerceModalOpen] = useState(false)
  const requestedPlatform = searchParams.get('platform')
  const selectedPlatform = toValidPlatform(requestedPlatform)
  const {
    mutate: startSelectedPlatform,
    isPending: isStartingSelectedPlatform,
    isError: isSelectedStartError,
    error: selectedStartError,
  } = useStartConnection(selectedPlatform ?? 'shopify')
  const {
    mutate: completeSelectedWooCommerceConnection,
    isPending: isCompletingSelectedWooCommerceConnection,
    isError: isSelectedWooCommerceError,
    error: selectedWooCommerceError,
  } = useCompleteConnection('woocommerce')
  const isSelectedPlatformConnecting =
    isStartingSelectedPlatform || isCompletingSelectedWooCommerceConnection

  const connections = data?.data?.items ?? []

  const { connectedConnections, disconnectedConnections, missingPlatforms } = useMemo(() => {
    const connected = connections.filter((connection) => isConnectedStatus(connection.status))
    const disconnected = connections.filter((connection) => !isConnectedStatus(connection.status))
    const connectedPlatformSet = new Set(
      connections
        .map((connection) => toValidPlatform(connection.platform))
        .filter((platform): platform is ConnectionPlatform => platform !== null)
    )
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

  const handleSelectedPlatformStart = () => {
    if (!selectedPlatform) {
      return
    }

    if (requiresCredentialModal(selectedPlatform)) {
      if (selectedPlatform === 'shopify') {
        setIsSelectedShopifyModalOpen(true)
      } else {
        setIsSelectedWooCommerceModalOpen(true)
      }
      return
    }

    startSelectedPlatform(undefined, {
      onSuccess: (response) => handleStartSuccess(selectedPlatform, response.data),
      onSettled: () => clearPlatformQuery(),
    })
  }

  const handleSelectedWooCommerceSubmit = (payload: {
    storeUrl: string
    consumerKey: string
    consumerSecret: string
  }) => {
    if (selectedPlatform !== 'woocommerce') {
      return
    }

    completeSelectedWooCommerceConnection(payload, {
      onSuccess: () => {
        setIsSelectedWooCommerceModalOpen(false)
        clearPlatformQuery()
      },
    })
  }

  const handleSelectedShopifySubmit = (shop: string) => {
    if (selectedPlatform !== 'shopify') {
      return
    }

    startSelectedPlatform(
      { shop },
      {
        onSuccess: (response) => {
          setIsSelectedShopifyModalOpen(false)
          handleStartSuccess(selectedPlatform, response.data)
        },
        onSettled: () => clearPlatformQuery(),
      }
    )
  }

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
            onClick={handleSelectedPlatformStart}
            disabled={isSelectedPlatformConnecting}
            className={cn(
              'rounded-[8px] px-4 py-2 text-subhead transition-all duration-200',
              isSelectedPlatformConnecting
                ? 'cursor-not-allowed bg-accent/40 text-white'
                : 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {isSelectedPlatformConnecting ? 'Connecting…' : `Connect ${toPlatformLabel(selectedPlatform)}`}
          </button>
        </div>
      ) : null}

      <ShopifyStoreModal
        open={isSelectedShopifyModalOpen}
        isSubmitting={isStartingSelectedPlatform}
        platformLabel={toPlatformLabel('shopify')}
        startError={
          isSelectedShopifyModalOpen && isSelectedStartError
            ? selectedStartError instanceof Error
              ? selectedStartError.message
              : 'Unable to start connection.'
            : undefined
        }
        onClose={() => setIsSelectedShopifyModalOpen(false)}
        onSubmit={handleSelectedShopifySubmit}
      />

      <WooCommerceCredentialsModal
        open={isSelectedWooCommerceModalOpen}
        isSubmitting={isCompletingSelectedWooCommerceConnection}
        platformLabel={toPlatformLabel('woocommerce')}
        submitError={
          isSelectedWooCommerceModalOpen && isSelectedWooCommerceError
            ? selectedWooCommerceError instanceof Error
              ? selectedWooCommerceError.message
              : 'Unable to complete connection.'
            : undefined
        }
        onClose={() => setIsSelectedWooCommerceModalOpen(false)}
        onSubmit={handleSelectedWooCommerceSubmit}
      />

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
            (() => {
              const normalizedPlatform = toValidPlatform(connection.platform)
              if (!normalizedPlatform) {
                return null
              }

              return (
                <ConnectPlatformCard
                  key={connection.id}
                  platform={normalizedPlatform}
                  statusLabel={connection.status}
                  helperText="This connection is disconnected. Reconnect to resume syncing."
                  isHighlighted={normalizedPlatform === selectedPlatform}
                  onStartSuccess={(platform, result) => {
                    handleStartSuccess(platform, result)
                    if (platform === selectedPlatform) {
                      clearPlatformQuery()
                    }
                  }}
                  onConnectionCompleted={(platform) => {
                    if (platform === selectedPlatform) {
                      clearPlatformQuery()
                    }
                  }}
                />
              )
            })()
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
              onConnectionCompleted={(completedPlatform) => {
                if (completedPlatform === selectedPlatform) {
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
