import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsService } from './settings.service';

const WorkspaceRole = {
  VIEWER: 'VIEWER',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
} as const;

type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

type QueryResult = Array<Record<string, unknown>>;

function createServiceHarness(params: {
  queryResults: QueryResult[];
}) {
  const rawCalls: any[] = [];
  const remainingQueryResults = [...params.queryResults];

  const prisma = {
    $queryRaw: async (...args: any[]) => {
      rawCalls.push(args);
      return remainingQueryResults.shift() ?? [];
    },
    workspaceMember: {
      findUnique: async () => ({ userId: 'existing-user' }),
    },
  };

  const rolesService = {
    ensureDefaultRoleDefinitions: async () => undefined,
  };

  return {
    service: new SettingsService(prisma as any, rolesService as any),
    rawCalls,
  };
}

test('updateMemberRole persists and returns roleDefinitionId when provided', async () => {
  const roleDefinitionId = 'f6f856f0-43f8-447d-8ddf-bd5917b96c2e';

  const { service, rawCalls } = createServiceHarness({
    queryResults: [
      [
        {
          id: roleDefinitionId,
          name: 'Ops Manager',
          permissions: ['orders.write'],
          legacyRole: WorkspaceRole.ADMIN,
        },
      ],
      [
        {
          userId: 'user-1',
          email: 'member@example.com',
          role: WorkspaceRole.ADMIN,
          roleDefinitionId,
          roleName: 'Ops Manager',
          permissions: ['orders.write'],
          joinedAt: new Date('2026-03-20T00:00:00.000Z'),
        },
      ],
    ],
  });

  const result = await service.updateMemberRole({
    workspaceId: 'workspace-1',
    userId: 'user-1',
    roleDefinitionId,
  });

  assert.equal(rawCalls.length, 2);
  assert.equal(rawCalls[1][1], WorkspaceRole.ADMIN);
  assert.equal(rawCalls[1][2], roleDefinitionId);
  assert.equal(result.roleDefinitionId, roleDefinitionId);
  assert.equal(result.roleName, 'Ops Manager');
  assert.deepEqual(result.permissions, ['orders.write']);
});

test('updateMemberRole with only legacy role sets canonical roleDefinitionId when resolved', async () => {
  const roleDefinitionId = '0608ff06-a934-41e9-87fd-c20f7efc2370';

  const { service, rawCalls } = createServiceHarness({
    queryResults: [
      [
        {
          id: roleDefinitionId,
          name: 'Default Admin',
          permissions: ['workspace.manage'],
          legacyRole: WorkspaceRole.ADMIN,
        },
      ],
      [
        {
          userId: 'user-2',
          email: 'admin@example.com',
          role: WorkspaceRole.ADMIN,
          roleDefinitionId,
          roleName: 'Default Admin',
          permissions: ['workspace.manage'],
          joinedAt: new Date('2026-03-20T00:00:00.000Z'),
        },
      ],
    ],
  });

  const result = await service.updateMemberRole({
    workspaceId: 'workspace-1',
    userId: 'user-2',
    role: WorkspaceRole.ADMIN,
  });

  assert.equal(rawCalls.length, 2);
  assert.equal(rawCalls[1][1], WorkspaceRole.ADMIN);
  assert.equal(rawCalls[1][2], roleDefinitionId);
  assert.equal(result.roleDefinitionId, roleDefinitionId);
});

test('updateMemberRole clears custom roleDefinitionId when switching to unresolved legacy role', async () => {
  const { service, rawCalls } = createServiceHarness({
    queryResults: [
      [],
      [
        {
          userId: 'user-3',
          email: 'viewer@example.com',
          role: WorkspaceRole.VIEWER,
          roleDefinitionId: null,
          roleName: null,
          permissions: null,
          joinedAt: new Date('2026-03-20T00:00:00.000Z'),
        },
      ],
    ],
  });

  const result = await service.updateMemberRole({
    workspaceId: 'workspace-1',
    userId: 'user-3',
    role: WorkspaceRole.VIEWER,
  });

  assert.equal(rawCalls.length, 2);
  assert.equal(rawCalls[1][1], WorkspaceRole.VIEWER);
  assert.equal(rawCalls[1][2], null);
  assert.equal(result.roleDefinitionId, null);
  assert.equal(result.roleName, WorkspaceRole.VIEWER);
  assert.deepEqual(result.permissions, []);
});
