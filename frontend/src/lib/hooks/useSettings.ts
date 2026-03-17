import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  settingsApi,
  type CreateWorkspaceRoleDto,
  type InviteWorkspaceMemberDto,
  type UpdateUserPreferencesDto,
  type UpdateWorkspaceMemberRoleDto,
  type UpdateWorkspaceRoleDto,
  type WorkspaceOnboardingSettingsDto,
} from '@/lib/api/endpoints/settings'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
import { usePreferencesStore } from '@/lib/store/preferencesStore'

const settingsKeys = {
  workspace: (workspaceId?: string) => ['settings', 'workspace', workspaceId] as const,
  preferences: ['settings', 'preferences'] as const,
  members: (workspaceId?: string) => ['settings', 'members', workspaceId] as const,
  roles: (workspaceId?: string) => ['settings', 'roles', workspaceId] as const,
}

export function useWorkspaceSettings() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: settingsKeys.workspace(workspaceId),
    queryFn: () => settingsApi.getWorkspace(),
    enabled: !!workspaceId,
  })
}

export function useUpdateWorkspace() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const workspaceRole = useWorkspaceStore((s) => s.workspace?.role)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: { name: string }) => settingsApi.updateWorkspace(dto),
    onSuccess: (res) => {
      setWorkspace({ id: res.data.id, name: res.data.name, role: workspaceRole ?? null })
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(workspaceId) })
    },
  })
}



export type { WorkspaceOnboardingSettingsDto }

export function useUpdateWorkspaceOnboardingSettings() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const workspaceRole = useWorkspaceStore((s) => s.workspace?.role)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: WorkspaceOnboardingSettingsDto) => settingsApi.updateWorkspaceOnboardingSettings(dto),
    onSuccess: (res) => {
      setWorkspace({ id: res.data.id, name: res.data.name, role: workspaceRole ?? null })
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(workspaceId) })
    },
  })
}
export function useMyPreferences() {
  const setPreferences = usePreferencesStore((state) => state.setPreferences)

  const query = useQuery({
    queryKey: settingsKeys.preferences,
    queryFn: () => settingsApi.getMyPreferences(),
  })

  useEffect(() => {
    if (query.data) {
      setPreferences(query.data.data.preferences)
    }
  }, [query.data, setPreferences])

  return query
}

export function useUpdateMyPreferences() {
  const queryClient = useQueryClient()
  const setPreferences = usePreferencesStore((state) => state.setPreferences)

  return useMutation({
    mutationFn: (dto: UpdateUserPreferencesDto) => settingsApi.updateMyPreferences(dto),
    onSuccess: (response) => {
      setPreferences(response.data.preferences)
      queryClient.invalidateQueries({ queryKey: settingsKeys.preferences })
    },
  })
}

export function useWorkspaceMembers() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: settingsKeys.members(workspaceId),
    queryFn: () => settingsApi.listMembers(),
    enabled: !!workspaceId,
  })
}

export function useInviteWorkspaceMember() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: InviteWorkspaceMemberDto) => settingsApi.inviteMember(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) })
    },
  })
}

export function useUpdateWorkspaceMemberRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, dto }: { userId: string; dto: UpdateWorkspaceMemberRoleDto }) =>
      settingsApi.updateMemberRole(userId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) })
    },
  })
}

export function useRemoveWorkspaceMember() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => settingsApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) })
    },
  })
}

export function useWorkspaceRoles() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: settingsKeys.roles(workspaceId),
    queryFn: () => settingsApi.listRoles(),
    enabled: !!workspaceId,
  })
}

export function useCreateWorkspaceRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateWorkspaceRoleDto) => settingsApi.createRole(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(workspaceId) })
    },
  })
}

export function useUpdateWorkspaceRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkspaceRoleDto }) => settingsApi.updateRole(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(workspaceId) })
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) })
    },
  })
}

export function useDeleteWorkspaceRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(workspaceId) })
    },
  })
}
