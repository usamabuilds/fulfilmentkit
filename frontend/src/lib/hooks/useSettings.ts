import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api/endpoints/settings'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useWorkspaceSettings() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['settings', 'workspace', workspaceId],
    queryFn: () => settingsApi.getWorkspace(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useUpdateWorkspace() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: { name: string }) =>
      settingsApi.updateWorkspace(workspaceId!, dto),
    onSuccess: (res) => {
      setWorkspace({ id: res.data.id, name: res.data.name })
      queryClient.invalidateQueries({ queryKey: ['settings', 'workspace', workspaceId] })
    },
  })
}

export function useWorkspaceMembers() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['settings', 'members', workspaceId],
    queryFn: () => settingsApi.listMembers(workspaceId!),
    enabled: !!workspaceId,
  })
}
