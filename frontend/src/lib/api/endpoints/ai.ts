import { apiGetList, apiPost } from '@/lib/api/client'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface AiConversation {
  id: string
  title: string
  createdAt: string
}

export interface AiToolResult {
  id: string
  tool: string
  status: string
  result: string | null
  createdAt: string
}

export const aiApi = {
  listConversations: (workspaceId: string) =>
    apiGetList<AiConversation>(`/workspaces/${workspaceId}/ai/conversations`),

  getMessages: (workspaceId: string, conversationId: string) =>
    apiGetList<AiMessage>(`/workspaces/${workspaceId}/ai/conversations/${conversationId}/messages`),

  sendMessage: (workspaceId: string, conversationId: string, content: string) =>
    apiPost<AiMessage>(`/workspaces/${workspaceId}/ai/conversations/${conversationId}/messages`, { content }),

  createConversation: (workspaceId: string) =>
    apiPost<AiConversation>(`/workspaces/${workspaceId}/ai/conversations`, {}),

  listToolResults: (workspaceId: string) =>
    apiGetList<AiToolResult>(`/workspaces/${workspaceId}/ai/tool-results`),
}
