import { useAuthStore } from '../store/authStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import type { ApiListResponse, ApiResponse } from './types'

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is not set')
  return url
}

export type UnauthorizedRedirectReason = 'expired_token' | 'revoked_membership' | 'missing_workspace_header'

export interface ApiClientError extends Error {
  statusCode: number
  errorCode?: string
}

interface UnauthorizedResolution {
  shouldHandle: boolean
  redirectPath: '/login' | '/workspaces'
  reason: UnauthorizedRedirectReason
}

export function resolveUnauthorizedResolution(statusCode: number): UnauthorizedResolution {
  const workspaceId = useWorkspaceStore.getState().workspace?.id

  if (statusCode === 401) {
    return {
      shouldHandle: true,
      redirectPath: '/login',
      reason: 'expired_token',
    }
  }

  if (statusCode === 403 && workspaceId) {
    return {
      shouldHandle: true,
      redirectPath: '/workspaces',
      reason: 'revoked_membership',
    }
  }

  if (statusCode === 403) {
    return {
      shouldHandle: true,
      redirectPath: '/workspaces',
      reason: 'missing_workspace_header',
    }
  }

  return {
    shouldHandle: false,
    redirectPath: '/login',
    reason: 'expired_token',
  }
}

function redirectTo(path: '/login' | '/workspaces') {
  if (typeof window === 'undefined') return
  if (window.location.pathname === path) return
  window.location.assign(path)
}

function handleUnauthorized(statusCode: number) {
  const resolution = resolveUnauthorizedResolution(statusCode)
  if (!resolution.shouldHandle) return

  useAuthStore.getState().clearAuth()
  useWorkspaceStore.getState().clearWorkspace()
  redirectTo(resolution.redirectPath)
}

function getHeaders(): HeadersInit {
  const jwt = useAuthStore.getState().jwt
  const workspaceId = useWorkspaceStore.getState().workspace?.id

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (jwt) headers.Authorization = `Bearer ${jwt}`
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId

  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json: unknown = await res.json()

  if (!res.ok) {
    handleUnauthorized(res.status)

    const objectPayload = typeof json === 'object' && json !== null ? json : null
    const errorPayload =
      objectPayload && 'error' in objectPayload && typeof objectPayload.error === 'object' && objectPayload.error !== null
        ? objectPayload.error
        : null

    const nestedErrorMessage =
      errorPayload && 'message' in errorPayload && typeof errorPayload.message === 'string'
        ? errorPayload.message
        : null
    const nestedErrorCode =
      errorPayload && 'code' in errorPayload && typeof errorPayload.code === 'string' ? errorPayload.code : undefined

    const legacyMessage =
      objectPayload && 'message' in objectPayload && typeof objectPayload.message === 'string'
        ? objectPayload.message
        : null
    const legacyErrorString =
      objectPayload && 'error' in objectPayload && typeof objectPayload.error === 'string' ? objectPayload.error : null

    const message = nestedErrorMessage ?? legacyMessage ?? legacyErrorString ?? `HTTP ${res.status}`

    const error = new Error(message) as ApiClientError
    error.statusCode = res.status
    error.errorCode = nestedErrorCode
    throw error
  }

  return json as T
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  return handleResponse<ApiResponse<T>>(res)
}

export async function apiGetList<T>(path: string): Promise<ApiListResponse<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  return handleResponse<ApiListResponse<T>>(res)
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<ApiResponse<T>>(res)
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<ApiResponse<T>>(res)
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  return handleResponse<ApiResponse<T>>(res)
}
