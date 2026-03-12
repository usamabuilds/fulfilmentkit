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
  listConversations: () => apiGetList<AiConversation>('/ai/conversations'),

  getMessages: (conversationId: string) => apiGetList<AiMessage>(`/ai/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string) =>
    apiPost<AiMessage>(`/ai/conversations/${conversationId}/messages`, { content }),

  createConversation: () => apiPost<AiConversation>('/ai/conversations', {}),

  listToolResults: () => apiGetList<AiToolResult>('/ai/tools/kpi-summary'),
}
