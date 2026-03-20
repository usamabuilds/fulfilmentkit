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
  platform: ConnectionPlatform
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

export const connectionsApi = {
  list: () => apiGetList<Connection>('/connections'),

  getOne: (connectionId: string) => apiGet<Connection>(`/connections/${connectionId}`),

  start: (platform: ConnectionPlatform) => apiPost<StartConnectionResult>(`/connections/${platform}/start`, {}),

  startSync: (connectionId: string) => apiPost<void>(`/connections/${connectionId}/sync`, {}),
}
