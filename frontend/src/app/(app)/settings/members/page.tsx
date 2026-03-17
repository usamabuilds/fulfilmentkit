'use client'
import { useMemo, useState } from 'react'
import {
  useInviteWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useWorkspaceMembers,
  useWorkspaceRoles,
} from '@/lib/hooks/useSettings'
import { formatDate } from '@/lib/utils/formatDate'
import { cn } from '@/lib/utils/cn'

const roleStyles: Record<string, string> = {
  Owner: 'bg-accent/10 text-accent',
  Admin: 'bg-success/10 text-success',
  Viewer: 'bg-black/5 text-text-secondary',
}

export default function MembersPage() {
  const { data, isLoading } = useWorkspaceMembers()
  const { data: rolesData } = useWorkspaceRoles()
  const { mutateAsync: inviteMember, isPending: isInviting } = useInviteWorkspaceMember()
  const { mutateAsync: updateMemberRole, isPending: isUpdatingRole } = useUpdateWorkspaceMemberRole()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const members = data?.data?.items ?? []
  const roles = rolesData?.data?.items ?? []

  const defaultRoleId = useMemo(() => {
    return roles.find((role) => role.legacyRole === 'VIEWER')?.id ?? ''
  }, [roles])

  async function onInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      await inviteMember({
        email: inviteEmail.trim(),
        roleDefinitionId: inviteRoleId || defaultRoleId || undefined,
      })
      setInviteEmail('')
      setInviteRoleId(defaultRoleId)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to invite member')
    }
  }

  async function onRoleChange(userId: string, roleDefinitionId: string) {
    setError(null)

    try {
      await updateMemberRole({ userId, dto: { roleDefinitionId } })
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update role')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Members</h1>
        <p className="text-body text-text-secondary mt-1">People with access to this workspace.</p>
      </div>

      <form onSubmit={onInviteSubmit} className="glass-panel p-4 flex flex-col gap-3">
        <h2 className="text-title-3 text-text-primary">Invite member</h2>
        <div className="grid md:grid-cols-[1fr_220px_auto] gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            className="glass-input"
            placeholder="teammate@company.com"
            required
          />
          <select
            value={inviteRoleId || defaultRoleId}
            onChange={(event) => setInviteRoleId(event.target.value)}
            className="glass-input"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail.trim()}
            className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {isInviting ? 'Inviting…' : 'Invite'}
          </button>
        </div>
      </form>

      {error && <p className="text-footnote text-destructive">{error}</p>}

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
                  <td className="px-5 py-3 flex items-center gap-2">
                    <span className={cn('text-caption-2 px-2.5 py-1 rounded-full', roleStyles[member.roleName] ?? 'bg-black/5 text-text-secondary')}>
                      {member.roleName}
                    </span>
                    <select
                      value={member.roleDefinitionId ?? ''}
                      onChange={(event) => onRoleChange(member.userId, event.target.value)}
                      className="glass-input py-1.5 text-footnote"
                      disabled={isUpdatingRole}
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
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
