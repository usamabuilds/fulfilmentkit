import assert from 'node:assert/strict';
import test from 'node:test';
import { RolesService } from '../roles/roles.service';
import { SettingsMembersController } from './settings-members.controller';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('roles creation id can be assigned through /settings/members/:userId/role payload', async () => {
  const createdRoleId = '0f6d6b24-4b0a-4498-a7d0-a2ec1515f8e9';
  const rolesPrisma = {
    $queryRaw: async () => [
      {
        id: createdRoleId,
        name: 'Operations',
        description: null,
        permissions: ['orders.write'],
        isSystem: false,
        legacyRole: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const rolesService = new RolesService(rolesPrisma as any);
  const created = await rolesService.createRole({
    workspaceId: 'workspace-1',
    name: 'Operations',
    description: null,
    permissions: ['orders.write'],
  });

  assert.match(created.id, UUID_REGEX);

  const updateCalls: any[] = [];
  const settingsService = {
    updateMemberRole: async (args: any) => {
      updateCalls.push(args);
      return {
        userId: args.userId,
        email: 'member@example.com',
        role: 'VIEWER',
        roleDefinitionId: args.roleDefinitionId,
        roleName: 'Operations',
        permissions: ['orders.write'],
        joinedAt: new Date('2026-03-17T00:00:00.000Z'),
      };
    },
  };

  const controller = new SettingsMembersController(settingsService as any);
  const response = await controller.updateMemberRole(
    { workspaceId: 'workspace-1' },
    'user-123',
    { roleDefinitionId: created.id },
  );

  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].roleDefinitionId, created.id);
  assert.equal(response.data.roleDefinitionId, created.id);
});

test('updateMemberRole rejects malformed roleDefinitionId payload', async () => {
  const settingsService = { updateMemberRole: async () => ({}) };
  const controller = new SettingsMembersController(settingsService as any);

  await assert.rejects(
    async () =>
      controller.updateMemberRole(
        { workspaceId: 'workspace-1' },
        'user-123',
        { roleDefinitionId: 'not-a-uuid' },
      ),
  );
});
