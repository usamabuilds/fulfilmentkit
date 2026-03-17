'use client'

import { useState } from 'react'
import {
  useCreateWorkspaceRole,
  useDeleteWorkspaceRole,
  useUpdateWorkspaceRole,
  useWorkspaceRoles,
} from '@/lib/hooks/useSettings'

const availablePermissions = [
  'workspace.manage',
  'members.manage',
  'roles.manage',
  'catalog.read',
  'catalog.write',
  'inventory.read',
  'inventory.write',
  'orders.read',
  'orders.write',
  'forecast.read',
  'forecast.write',
  'connections.write',
  'analytics.view',
]

export default function SettingsRolesPage() {
  const { data, isLoading } = useWorkspaceRoles()
  const { mutateAsync: createRole } = useCreateWorkspaceRole()
  const { mutateAsync: updateRole } = useUpdateWorkspaceRole()
  const { mutateAsync: deleteRole } = useDeleteWorkspaceRole()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['catalog.read'])
  const [error, setError] = useState<string | null>(null)

  const roles = data?.data?.items ?? []

  function togglePermission(permission: string) {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    )
  }

  async function onCreateRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      await createRole({ name: name.trim(), description: description.trim() || null, permissions: selectedPermissions })
      setName('')
      setDescription('')
      setSelectedPermissions(['catalog.read'])
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create role')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title-1 text-text-primary">Roles</h1>
        <p className="text-body text-text-secondary mt-1">Create and manage workspace-scoped roles.</p>
      </div>

      <form onSubmit={onCreateRole} className="glass-panel p-4 space-y-3">
        <h2 className="text-title-3 text-text-primary">Create role</h2>
        <input className="glass-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Role name" required />
        <textarea className="glass-input min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description (optional)" />
        <div className="grid md:grid-cols-3 gap-2">
          {availablePermissions.map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-footnote text-text-secondary">
              <input type="checkbox" checked={selectedPermissions.includes(permission)} onChange={() => togglePermission(permission)} />
              <span>{permission}</span>
            </label>
          ))}
        </div>
        <button type="submit" className="px-4 py-2 rounded-[8px] text-callout text-white bg-accent hover:bg-accent-hover">
          Create role
        </button>
      </form>

      {error && <p className="text-footnote text-destructive">{error}</p>}

      {isLoading ? (
        <div className="skeleton h-32" />
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Name</th>
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Permissions</th>
                <th className="text-left text-subhead text-text-secondary px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-border-subtle last:border-0 align-top">
                  <td className="px-5 py-3 text-body text-text-primary">{role.name}</td>
                  <td className="px-5 py-3 text-footnote text-text-secondary">{role.permissions.join(', ')}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-[8px] border border-border-default text-footnote"
                        onClick={() => updateRole({ id: role.id, dto: { description: role.description ?? '' } })}
                      >
                        Save
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-[8px] border border-destructive/40 text-footnote text-destructive"
                          onClick={() => deleteRole(role.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
