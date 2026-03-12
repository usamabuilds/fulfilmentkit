import assert from 'node:assert/strict'
import { useWorkspaceStore } from '../store/workspaceStore'
import { resolveUnauthorizedResolution } from './client'

function runIntegrationTests() {
  useWorkspaceStore.getState().clearWorkspace()
  const expiredTokenResolution = resolveUnauthorizedResolution(401)
  assert.equal(expiredTokenResolution.shouldHandle, true)
  assert.equal(expiredTokenResolution.redirectPath, '/login')
  assert.equal(expiredTokenResolution.reason, 'expired_token')

  useWorkspaceStore.getState().setWorkspace({ id: 'ws-1', name: 'Primary' })
  const revokedMembershipResolution = resolveUnauthorizedResolution(403)
  assert.equal(revokedMembershipResolution.shouldHandle, true)
  assert.equal(revokedMembershipResolution.redirectPath, '/workspaces')
  assert.equal(revokedMembershipResolution.reason, 'revoked_membership')

  useWorkspaceStore.getState().clearWorkspace()
  const missingWorkspaceHeaderResolution = resolveUnauthorizedResolution(403)
  assert.equal(missingWorkspaceHeaderResolution.shouldHandle, true)
  assert.equal(missingWorkspaceHeaderResolution.redirectPath, '/workspaces')
  assert.equal(missingWorkspaceHeaderResolution.reason, 'missing_workspace_header')
}

runIntegrationTests()
console.log('client integration tests passed')
