'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useWorkspaceMembers,
  useWorkspaceRoles,
} from '@/lib/hooks/useSettings'
import { useWorkspaceStore } from '@/lib/store/workspaceStore'
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
  const { mutateAsync: removeMember, isPending: isRemovingMember } = useRemoveWorkspaceMember()
  const currentWorkspaceRole = useWorkspaceStore((state) => state.workspace?.role)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const members = data?.data?.items ?? []
  const roles = rolesData?.data?.items ?? []
  const isOwner = currentWorkspaceRole === 'OWNER'

  const defaultRoleId = useMemo(() => {
    return roles.find((role) => role.legacyRole === 'VIEWER')?.id ?? roles[0]?.id ?? ''
  }, [roles])

  useEffect(() => {
    if (!inviteRoleId && defaultRoleId) {
      setInviteRoleId(defaultRoleId)
    }
  }, [defaultRoleId, inviteRoleId])

  async function onInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      await inviteMember({
        email: inviteEmail.trim(),
        roleDefinitionId: inviteRoleId || defaultRoleId || undefined,
      })
      setInviteEmail('')
      setInviteRoleId(defaultRoleId)
      setSuccess('Invite sent successfully.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to invite member')
    }
  }

  async function onSaveRole(userId: string) {
    const roleDefinitionId = pendingRoleChanges[userId]
    if (!roleDefinitionId) return

    setError(null)
    setSuccess(null)

    try {
      await updateMemberRole({ userId, dto: { roleDefinitionId } })
      setPendingRoleChanges((current) => {
        const next = { ...current }
        delete next[userId]
        return next
      })
      setSuccess('Member role updated.')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update role')
    }
  }

  async function onRemoveMember(userId: string, email: string) {
    if (!window.confirm(`Remove ${email} from this workspace?`)) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      await removeMember(userId)
      setSuccess('Member removed successfully.')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove member')
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
            disabled={!isOwner}
          />
          <select
            value={inviteRoleId}
            onChange={(event) => setInviteRoleId(event.target.value)}
            className="glass-input"
            disabled={!isOwner}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail.trim() || !isOwner}
            className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {isInviting ? 'Inviting…' : 'Invite'}
          </button>
        </div>
        {!isOwner && <p className="text-footnote text-text-secondary">Only owners can invite, update, or remove members.</p>}
      </form>

      {(error || success) && (
        <div className="glass-panel p-3 flex flex-col gap-1">
          {error && <p className="text-footnote text-destructive">{error}</p>}
          {success && <p className="text-footnote text-success">{success}</p>}
        </div>
      )}

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
                {isOwner && <th className="text-left text-subhead text-text-secondary px-5 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const selectedRoleDefinitionId = pendingRoleChanges[member.userId] ?? member.roleDefinitionId ?? ''
                const hasPendingRoleChange = pendingRoleChanges[member.userId] !== undefined

                return (
                  <tr
                    key={member.userId}
                    className="border-b border-border-subtle last:border-0 hover:bg-black/[0.02] transition-colors"
                  >
                    <td className="px-5 py-3 text-body text-text-primary">{member.email}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-caption-2 px-2.5 py-1 rounded-full',
                            roleStyles[member.roleName] ?? 'bg-black/5 text-text-secondary'
                          )}
                        >
                          {member.roleName}
                        </span>
                        {isOwner && (
                          <select
                            value={selectedRoleDefinitionId}
                            onChange={(event) =>
                              setPendingRoleChanges((current) => ({
                                ...current,
                                [member.userId]: event.target.value,
                              }))
                            }
                            className="glass-input py-1.5 text-footnote"
                            disabled={isUpdatingRole}
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-body text-text-secondary">{formatDate(member.joinedAt)}</td>
                    {isOwner && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveRole(member.userId)}
                            disabled={!hasPendingRoleChange || isUpdatingRole}
                            className="px-3 py-1.5 rounded-[8px] text-footnote text-white bg-accent hover:bg-accent-hover disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveMember(member.userId, member.email)}
                            disabled={isRemovingMember}
                            className="px-3 py-1.5 rounded-[8px] text-footnote text-destructive border border-destructive/40 hover:bg-destructive/10 disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
