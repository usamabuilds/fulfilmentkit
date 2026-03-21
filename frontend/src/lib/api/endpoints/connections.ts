import { apiGet, apiGetList, apiPost } from '@/lib/api/client'

export const connectionPlatforms = [
  'shopify',
  'woocommerce',
  'amazon',
  'zoho',
  'xero',
  'sage',
  'odoo',
  'quickbooks',
] as const

export type ConnectionPlatform = (typeof connectionPlatforms)[number]

export type ConnectionStatus = 'active' | 'disconnected' | 'error'

export interface Connection {
  id: string
  platform: ConnectionPlatform | Uppercase<ConnectionPlatform>
  displayName?: string | null
  status: ConnectionStatus
  lastSyncAt: string | null
  createdAt: string
}

export interface StartConnectionAuthUrlResult {
  type: 'auth_url'
  url: string
}

export interface StartConnectionInstructionsResult {
  type: 'instructions'
  title: string
  steps: string[]
  message?: string
}

export type StartConnectionResult = StartConnectionAuthUrlResult | StartConnectionInstructionsResult

interface StartConnectionPayloadByPlatform {
  shopify: {
    shop: string
  }
}

export type StartConnectionPayload<TPlatform extends ConnectionPlatform = ConnectionPlatform> =
  TPlatform extends keyof StartConnectionPayloadByPlatform
    ? StartConnectionPayloadByPlatform[TPlatform]
    : Record<string, never>

type StartConnectionPayloadArg<TPlatform extends ConnectionPlatform> = TPlatform extends 'shopify'
  ? [payload: StartConnectionPayload<'shopify'>]
  : [payload?: StartConnectionPayload<TPlatform>]

interface CompleteConnectionPayloadByPlatform {
  woocommerce: {
    storeUrl: string
    consumerKey: string
    consumerSecret: string
  }
}

export type CompleteConnectionPayload<TPlatform extends ConnectionPlatform = ConnectionPlatform> =
  TPlatform extends keyof CompleteConnectionPayloadByPlatform
    ? CompleteConnectionPayloadByPlatform[TPlatform]
    : Record<string, never>

type CompleteConnectionPayloadArg<TPlatform extends ConnectionPlatform> =
  TPlatform extends 'woocommerce'
    ? [payload: CompleteConnectionPayload<'woocommerce'>]
    : [payload?: CompleteConnectionPayload<TPlatform>]

function startConnection<TPlatform extends ConnectionPlatform>(
  platform: TPlatform,
  ...args: StartConnectionPayloadArg<TPlatform>
) {
  const [payload] = args

  return apiPost<StartConnectionResult>(`/connections/${platform}/start`, payload ?? {})
}

function completeConnection<TPlatform extends ConnectionPlatform>(
  platform: TPlatform,
  ...args: CompleteConnectionPayloadArg<TPlatform>
) {
  const [payload] = args

  return apiPost<void>(`/connections/${platform}/callback`, payload ?? {})
}

export const connectionsApi = {
  list: () => apiGetList<Connection>('/connections'),

  getOne: (connectionId: string) => apiGet<Connection>(`/connections/${connectionId}`),

  start: startConnection,
  complete: completeConnection,

  startSync: (connectionId: string) => apiPost<void>(`/connections/${connectionId}/sync`, {}),
}
