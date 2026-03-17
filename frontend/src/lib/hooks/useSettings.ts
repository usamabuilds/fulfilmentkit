import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  settingsApi,
  type CreateWorkspaceRoleDto,
  type InviteWorkspaceMemberDto,
  type UpdateWorkspaceMemberRoleDto,
  type UpdateWorkspaceRoleDto,
} from '@/lib/api/endpoints/settings'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useWorkspaceSettings() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['settings', 'workspace', workspaceId],
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
      queryClient.invalidateQueries({ queryKey: ['settings', 'workspace', workspaceId] })
    },
  })
}

export function useWorkspaceMembers() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['settings', 'members', workspaceId],
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
      queryClient.invalidateQueries({ queryKey: ['settings', 'members', workspaceId] })
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
      queryClient.invalidateQueries({ queryKey: ['settings', 'members', workspaceId] })
    },
  })
}

export function useRemoveWorkspaceMember() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => settingsApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'members', workspaceId] })
    },
  })
}

export function useWorkspaceRoles() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['settings', 'roles', workspaceId],
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
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles', workspaceId] })
    },
  })
}

export function useUpdateWorkspaceRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWorkspaceRoleDto }) => settingsApi.updateRole(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'members', workspaceId] })
    },
  })
}

export function useDeleteWorkspaceRole() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles', workspaceId] })
    },
  })
}
