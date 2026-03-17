import assert from 'node:assert/strict'
import { normalizeUpdatedUserPreferencesResponse, normalizeUserPreferencesResponse } from './endpoints/settings'
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

  const normalizedPreferences = normalizeUserPreferencesResponse({
    preferences: {
      timezone: 'Europe/London',
      locale: 'en-GB',
      defaultCurrency: 'GBP',
      planningCadence: 'biweekly',
    },
  })
  assert.deepEqual(normalizedPreferences, {
    preferences: {
      timezone: 'Europe/London',
      locale: 'en-GB',
      defaultCurrency: 'GBP',
      planningCadence: 'biweekly',
    },
  })

  const normalizedMalformedPreferences = normalizeUserPreferencesResponse({
    preferences: {
      timezone: 123,
      locale: null,
      defaultCurrency: true,
      planningCadence: ['weekly'],
    },
  })
  assert.deepEqual(normalizedMalformedPreferences, {
    preferences: {
      timezone: null,
      locale: null,
      defaultCurrency: null,
      planningCadence: null,
    },
  })

  const normalizedUpdatedPreferences = normalizeUpdatedUserPreferencesResponse({
    updated: true,
    preferences: {
      timezone: 'UTC',
      locale: 'en-US',
      defaultCurrency: 'USD',
      planningCadence: 'weekly',
    },
  })
  assert.deepEqual(normalizedUpdatedPreferences, {
    updated: true,
    preferences: {
      timezone: 'UTC',
      locale: 'en-US',
      defaultCurrency: 'USD',
      planningCadence: 'weekly',
    },
  })

  const normalizedMalformedUpdatedPreferences = normalizeUpdatedUserPreferencesResponse({
    updated: 'yes',
    preferences: 'invalid',
  })
  assert.deepEqual(normalizedMalformedUpdatedPreferences, {
    updated: false,
    preferences: null,
  })
}

runIntegrationTests()
console.log('client integration tests passed')
