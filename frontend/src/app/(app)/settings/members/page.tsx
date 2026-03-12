'use client'
import { useWorkspaceMembers } from '@/lib/hooks/useSettings'
import { formatDate } from '@/lib/utils/formatDate'
import { cn } from '@/lib/utils/cn'

const roleStyles: Record<string, string> = {
  OWNER: 'bg-accent/10 text-accent',
  ADMIN: 'bg-success/10 text-success',
  VIEWER: 'bg-black/5 text-text-secondary',
}

export default function MembersPage() {
  const { data, isLoading } = useWorkspaceMembers()
  const members = data?.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Members</h1>
        <p className="text-body text-text-secondary mt-1">People with access to this workspace.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <p className="text-body text-text-secondary">No members found.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Email</th>
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Role</th>
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className="border-b border-border-subtle last:border-0 hover:bg-black/[0.02] transition-colors">
                  <td className="px-5 py-3 text-body text-text-primary">{member.email}</td>
                  <td className="px-5 py-3">
                    <span className={cn('text-caption-2 px-2.5 py-1 rounded-full', roleStyles[member.role] ?? 'bg-black/5 text-text-secondary')}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-body text-text-secondary">{formatDate(member.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
