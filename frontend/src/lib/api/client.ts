import { useAuthStore } from '@/lib/store/authStore'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import type { ApiListResponse, ApiResponse } from './types'

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is not set')
  return url
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
  const json = await res.json()

  if (!res.ok) {
    const message = json?.message ?? `HTTP ${res.status}`
    const error = new Error(message) as Error & { statusCode: number }
    error.statusCode = res.status
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
