import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiApi } from '@/lib/api/endpoints/ai'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'

export function useAiConversations() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['ai', 'conversations', workspaceId],
    queryFn: () => aiApi.listConversations(),
    enabled: !!workspaceId,
  })
}

export function useAiMessages(conversationId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['ai', 'messages', workspaceId, conversationId],
    queryFn: () => aiApi.getMessages(conversationId),
    enabled: !!workspaceId && !!conversationId,
  })
}

export function useSendMessage(conversationId: string) {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      aiApi.sendMessage(conversationId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'messages', workspaceId, conversationId] })
    },
  })
}

export function useCreateConversation() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aiApi.createConversation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', workspaceId] })
    },
  })
}

export function useAiToolResults() {
  const workspaceId = useWorkspaceStore((s) => s.workspace?.id)
  return useQuery({
    queryKey: ['ai', 'tool-results', workspaceId],
    queryFn: () => aiApi.listToolResults(),
    enabled: !!workspaceId,
  })
}
