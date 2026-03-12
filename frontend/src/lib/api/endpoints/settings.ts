import { apiGet, apiGetList, apiPatch } from '@/lib/api/client'
import type { ApiListResponse } from '@/lib/api/types'

export interface WorkspaceSettings {
  id: string
  name: string
  createdAt: string
}

export interface WorkspaceMember {
  userId: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'VIEWER'
  joinedAt: string
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

  if (typeof candidate.joinedAt !== 'string') {
    throw new Error('Invalid workspace member payload: missing joinedAt')
  }
}

export const settingsApi = {
  getWorkspace: () => apiGet<WorkspaceSettings>('/settings'),

  updateWorkspace: (dto: { name: string }) => apiPatch<WorkspaceSettings>('/settings', dto),

  listMembers: async (): Promise<ApiListResponse<WorkspaceMember>> => {
    const response = await apiGetList<unknown>('/settings/members')
    response.data.items.forEach(assertWorkspaceMemberContract)
    return response as ApiListResponse<WorkspaceMember>
  },
}
