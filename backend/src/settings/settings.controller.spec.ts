import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsController } from './settings.controller';

test('patchSettings forwards full payload and actingUserId to settings service', async () => {
  const calls: Array<{ workspaceId: string; input: Record<string, unknown> }> = [];
  const controller = new SettingsController({
    updateWorkspaceSettings: async (workspaceId: string, input: Record<string, unknown>) => {
      calls.push({ workspaceId, input });
      return { id: workspaceId, ...input };
    },
  } as any);

  const response = await controller.patchSettings(
    {
      workspaceId: 'workspace-1',
      user: { id: 'user-1' },
    },
    {
      name: 'Acme',
      timezone: 'America/New_York',
      locale: 'en-US',
      defaultCurrency: 'USD',
      planningCadence: 'weekly',
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.workspaceId, 'workspace-1');
  assert.deepEqual(calls[0]?.input, {
    name: 'Acme',
    timezone: 'America/New_York',
    locale: 'en-US',
    defaultCurrency: 'USD',
    planningCadence: 'weekly',
    actingUserId: 'user-1',
  });
  assert.equal(response.data.name, 'Acme');
  assert.equal(response.data.planningCadence, 'weekly');
});

test('patchSettings still accepts name-only payload', async () => {
  const controller = new SettingsController({
    updateWorkspaceSettings: async (_workspaceId: string, input: Record<string, unknown>) => ({
      id: 'workspace-1',
      ...input,
    }),
  } as any);

  const response = await controller.patchSettings(
    {
      workspaceId: 'workspace-1',
      user: { id: 'user-1' },
    },
    {
      name: 'Name Only',
    },
  );

  assert.equal(response.data.name, 'Name Only');
});

test('patchSettings rejects invalid planningCadence', async () => {
  const controller = new SettingsController({
    updateWorkspaceSettings: async () => ({ id: 'workspace-1' }),
  } as any);

  await assert.rejects(async () =>
    controller.patchSettings(
      {
        workspaceId: 'workspace-1',
        user: { id: 'user-1' },
      },
      {
        name: 'Acme',
        planningCadence: 'daily',
      },
    ),
  );
});

test('patchSettings rejects unknown keys to enforce strict payload policy', async () => {
  const controller = new SettingsController({
    updateWorkspaceSettings: async () => ({ id: 'workspace-1' }),
  } as any);

  await assert.rejects(async () =>
    controller.patchSettings(
      {
        workspaceId: 'workspace-1',
        user: { id: 'user-1' },
      },
      {
        name: 'Acme',
        unsupported: 'value',
      },
    ),
  );
});
