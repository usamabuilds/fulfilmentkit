'use client'

import { FormEvent, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAiMessages, useSendMessage } from '@/lib/hooks/useAi'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'

export default function AiConversationDetailPage() {
  const params = useParams<{ id: string }>()
  const conversationId = params.id
  const [content, setContent] = useState('')

  const { data, isLoading } = useAiMessages(conversationId)
  const { mutate: sendMessage, isPending } = useSendMessage(conversationId)

  const conversation = data?.data
  const messages = conversation?.messages ?? []

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextContent = content.trim()
    if (!nextContent || isPending) return

    sendMessage(nextContent, {
      onSuccess: () => setContent(''),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-2 text-text-primary">{conversation?.title ?? 'Conversation'}</h1>
        <p className="mt-1 text-body text-text-secondary">Ask a question and review assistant responses.</p>
      </div>

      <div className="glass-panel flex min-h-[420px] flex-col gap-4 p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-body text-text-secondary">No messages yet. Send your first prompt below.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[80%] rounded-xl p-3',
                  message.role === 'user'
                    ? 'ml-auto bg-accent/20 text-text-primary'
                    : 'bg-white/10 text-text-primary',
                )}
              >
                <p className="text-footnote uppercase tracking-wide text-text-tertiary">{message.role}</p>
                <p className="mt-1 text-body">{message.content}</p>
                <p className="mt-1 text-caption text-text-tertiary">{formatDateTime(message.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="glass-card flex items-center gap-3 p-3">
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Type your message..."
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-body text-text-primary outline-none ring-1 ring-white/10 placeholder:text-text-tertiary focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isPending || content.trim().length === 0}
          className={cn(
            'rounded-[8px] px-4 py-2 text-callout text-white transition-all duration-200',
            isPending || content.trim().length === 0
              ? 'cursor-not-allowed bg-accent/50'
              : 'bg-accent hover:bg-accent-hover active:scale-[0.98]',
          )}
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
