'use client'
import { useState, useEffect } from 'react'
import { useWorkspaceSettings, useUpdateWorkspace } from '@/lib/hooks/useSettings'
import { cn } from '@/lib/utils/cn'

export default function SettingsPage() {
  const { data, isLoading } = useWorkspaceSettings()
  const { mutate, isPending, isSuccess, isError, error } = useUpdateWorkspace()
  const [name, setName] = useState('')

  useEffect(() => {
    if (data?.data?.name) setName(data.data.name)
  }, [data?.data?.name])

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="text-title-1 text-text-primary">Settings</h1>
        <p className="text-body text-text-secondary mt-1">Manage your workspace settings.</p>
      </div>

      {isLoading ? (
        <div className="skeleton h-40" />
      ) : (
        <div className="glass-panel p-6 flex flex-col gap-4">
          <h2 className="text-title-3 text-text-primary">Workspace</h2>

          <div>
            <label className="text-subhead text-text-secondary block mb-1.5">Workspace name</label>
            <input
              className="glass-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {isSuccess && <p className="text-footnote text-success">Saved successfully.</p>}
          {isError && (
            <p className="text-footnote text-destructive">
              {error instanceof Error ? error.message : 'Failed to save.'}
            </p>
          )}

          <button
            onClick={() => mutate({ name: name.trim() })}
            disabled={isPending || !name.trim()}
            className={cn(
              'px-4 py-2 rounded-[8px] text-callout text-white transition-all duration-200 w-fit',
              isPending || !name.trim()
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
            )}
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
