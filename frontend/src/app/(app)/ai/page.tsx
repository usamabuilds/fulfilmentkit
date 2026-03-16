'use client'

import Link from 'next/link'
import { useAiConversations, useCreateConversation } from '@/lib/hooks/useAi'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'

export default function AiPage() {
  const { data, isLoading } = useAiConversations()
  const { mutate: createConversation, isPending } = useCreateConversation()
  const conversations = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-1 text-text-primary">AI Assistant</h1>
          <p className="mt-1 text-body text-text-secondary">Ask questions about your fulfilment data.</p>
        </div>
        <button
          onClick={() => createConversation()}
          disabled={isPending}
          className={cn(
            'rounded-[8px] px-4 py-2 text-callout text-white transition-all duration-200',
            isPending
              ? 'cursor-not-allowed bg-accent/50'
              : 'bg-accent hover:bg-accent-hover active:scale-[0.98]',
          )}
        >
          {isPending ? 'Creating…' : 'New Conversation'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No conversations yet.</p>
          <p className="mt-1 text-footnote text-text-tertiary">
            Start a new conversation to ask questions about your data.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/ai/${conv.id}`} className="glass-card block p-5 transition-colors hover:bg-white/10">
              <p className="text-headline text-text-primary">{conv.title}</p>
              <p className="mt-0.5 text-footnote text-text-tertiary">{formatDateTime(conv.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
