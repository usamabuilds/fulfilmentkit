import { apiDelete, apiGet, apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import type { ApiListResponse } from '@/lib/api/types'

export interface WorkspaceSettings {
  id: string
  name: string
  createdAt: string
}

export type LegacyWorkspaceRole = 'OWNER' | 'ADMIN' | 'VIEWER'

export interface UserPreferences {
  timezone: string | null
  locale: string | null
  defaultCurrency: string | null
  planningCadence: string | null
}

export interface UserPreferencesResponse {
  preferences: UserPreferences | null
}

export interface UpdateUserPreferencesDto {
  timezone?: string
  locale?: string
  defaultCurrency?: string
  planningCadence?: string
}

export interface UpdateUserPreferencesResponse {
  updated: boolean
  preferences: UserPreferences | null
}

export type PlanningCadence = 'weekly' | 'biweekly' | 'monthly'

export interface WorkspaceOnboardingSettingsDto {
  name: string
  timezone: string
  locale: string
  defaultCurrency: string
  planningCadence: PlanningCadence
}

export interface WorkspaceRoleDefinition {
  id: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  legacyRole: LegacyWorkspaceRole | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceMember {
  userId: string
  email: string
  role: LegacyWorkspaceRole
  roleDefinitionId: string | null
  roleName: string
  permissions: string[]
  joinedAt: string
}

export interface InviteWorkspaceMemberDto {
  email: string
  role?: LegacyWorkspaceRole
  roleDefinitionId?: string
}

export interface UpdateWorkspaceMemberRoleDto {
  role?: LegacyWorkspaceRole
  roleDefinitionId?: string
}

export interface RemoveWorkspaceMemberResponse {
  removed: boolean
}

export interface CreateWorkspaceRoleDto {
  name: string
  description?: string | null
  permissions: string[]
}

export interface UpdateWorkspaceRoleDto {
  name?: string
  description?: string | null
  permissions?: string[]
}

const workspaceMemberRoles = ['OWNER', 'ADMIN', 'VIEWER'] as const

function isWorkspaceMemberRole(role: unknown): role is WorkspaceMember['role'] {
  return typeof role === 'string' && workspaceMemberRoles.includes(role as WorkspaceMember['role'])
}

function assertWorkspaceMemberContract(member: unknown): asserts member is WorkspaceMember {
  if (typeof member !== 'object' || member === null) {
    throw new Error('Invalid workspace member payload: expected object')
  }

  const candidate = member as Record<string, unknown>

  if (typeof candidate.userId !== 'string') {
    throw new Error('Invalid workspace member payload: missing userId')
  }

  if (typeof candidate.email !== 'string') {
    throw new Error('Invalid workspace member payload: missing email')
  }

  if (!isWorkspaceMemberRole(candidate.role)) {
    throw new Error('Invalid workspace member payload: invalid role')
  }

  if (typeof candidate.roleName !== 'string') {
    throw new Error('Invalid workspace member payload: invalid roleName')
  }

  if (!(typeof candidate.roleDefinitionId === 'string' || candidate.roleDefinitionId === null)) {
    throw new Error('Invalid workspace member payload: invalid roleDefinitionId')
  }

  if (!Array.isArray(candidate.permissions)) {
    throw new Error('Invalid workspace member payload: invalid permissions')
  }

  if (typeof candidate.joinedAt !== 'string') {
    throw new Error('Invalid workspace member payload: missing joinedAt')
  }
}

function assertRemovedContract(payload: unknown): asserts payload is RemoveWorkspaceMemberResponse {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid remove member payload: expected object')
  }

  const candidate = payload as Record<string, unknown>

  if (typeof candidate.removed !== 'boolean') {
    throw new Error('Invalid remove member payload: missing removed flag')
  }
}


export function normalizeUserPreferences(preferences: unknown): UserPreferences | null {
  if (typeof preferences !== 'object' || preferences === null) {
    return null
  }

  const candidate = preferences as Record<string, unknown>

  return {
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : null,
    locale: typeof candidate.locale === 'string' ? candidate.locale : null,
    defaultCurrency: typeof candidate.defaultCurrency === 'string' ? candidate.defaultCurrency : null,
    planningCadence: typeof candidate.planningCadence === 'string' ? candidate.planningCadence : null,
  }
}

export function normalizeUserPreferencesResponse(payload: unknown): UserPreferencesResponse {
  if (typeof payload !== 'object' || payload === null) {
    return { preferences: null }
  }

  const candidate = payload as Record<string, unknown>
  return { preferences: normalizeUserPreferences(candidate.preferences) }
}

export function normalizeUpdatedUserPreferencesResponse(payload: unknown): UpdateUserPreferencesResponse {
  if (typeof payload !== 'object' || payload === null) {
    return { updated: false, preferences: null }
  }

  const candidate = payload as Record<string, unknown>
  return {
    updated: typeof candidate.updated === 'boolean' ? candidate.updated : false,
    preferences: normalizeUserPreferences(candidate.preferences),
  }
}

function assertWorkspaceRoleContract(role: unknown): asserts role is WorkspaceRoleDefinition {
  if (typeof role !== 'object' || role === null) {
    throw new Error('Invalid role payload: expected object')
  }

  const candidate = role as Record<string, unknown>

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
    throw new Error('Invalid role payload: id/name are required')
  }

  if (!Array.isArray(candidate.permissions)) {
    throw new Error('Invalid role payload: permissions are required')
  }
}

export const settingsApi = {
  getWorkspace: () => apiGet<WorkspaceSettings>('/settings'),

  updateWorkspace: (dto: { name: string }) => apiPatch<WorkspaceSettings>('/settings', dto),

  updateWorkspaceOnboardingSettings: (dto: WorkspaceOnboardingSettingsDto) =>
    apiPatch<WorkspaceSettings>('/settings', dto),

  getMyPreferences: async (): Promise<{ data: UserPreferencesResponse }> => {
    const response = await apiGet<unknown>('/me/preferences')
    return { ...response, data: normalizeUserPreferencesResponse(response.data) }
  },

  updateMyPreferences: async (dto: UpdateUserPreferencesDto): Promise<{ data: UpdateUserPreferencesResponse }> => {
    const response = await apiPatch<unknown>('/me/preferences', dto)
    return { ...response, data: normalizeUpdatedUserPreferencesResponse(response.data) }
  },

  listMembers: async (): Promise<ApiListResponse<WorkspaceMember>> => {
    const response = await apiGetList<unknown>('/settings/members')
    response.data.items.forEach(assertWorkspaceMemberContract)
    return response as ApiListResponse<WorkspaceMember>
  },

  inviteMember: async (dto: InviteWorkspaceMemberDto): Promise<WorkspaceMember> => {
    const response = await apiPost<unknown>('/settings/members/invite', dto)
    assertWorkspaceMemberContract(response.data)
    return response.data
  },

  updateMemberRole: async (userId: string, dto: UpdateWorkspaceMemberRoleDto): Promise<WorkspaceMember> => {
    const response = await apiPatch<unknown>(`/settings/members/${userId}/role`, dto)
    assertWorkspaceMemberContract(response.data)
    return response.data
  },

  removeMember: async (userId: string): Promise<RemoveWorkspaceMemberResponse> => {
    const response = await apiDelete<unknown>(`/settings/members/${userId}`)
    assertRemovedContract(response.data)
    return response.data
  },

  listRoles: async (): Promise<ApiListResponse<WorkspaceRoleDefinition>> => {
    const response = await apiGetList<unknown>('/settings/roles')
    response.data.items.forEach(assertWorkspaceRoleContract)
    return response as ApiListResponse<WorkspaceRoleDefinition>
  },

  createRole: async (dto: CreateWorkspaceRoleDto): Promise<WorkspaceRoleDefinition> => {
    const response = await apiPost<unknown>('/settings/roles', dto)
    assertWorkspaceRoleContract(response.data)
    return response.data
  },

  updateRole: async (id: string, dto: UpdateWorkspaceRoleDto): Promise<WorkspaceRoleDefinition> => {
    const response = await apiPatch<unknown>(`/settings/roles/${id}`, dto)
    assertWorkspaceRoleContract(response.data)
    return response.data
  },

  deleteRole: async (id: string): Promise<{ removed: boolean }> => {
    const response = await apiDelete<{ removed: boolean }>(`/settings/roles/${id}`)
    return response.data
  },
}
