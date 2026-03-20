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
  const transactionCalls: Array<{ workspaceId: string; workspaceName: string }> = [];
  const userUpdateCalls: Array<Record<string, unknown>> = [];
  const remainingQueryResults = [...params.queryResults];

  const tx = {
    workspace: {
      update: async ({ where, data }: { where: { id: string }; data: { name: string } }) => {
        transactionCalls.push({ workspaceId: where.id, workspaceName: data.name });
        return {
          id: where.id,
          name: data.name,
          createdAt: new Date('2026-03-20T00:00:00.000Z'),
          updatedAt: new Date('2026-03-20T00:00:00.000Z'),
        };
      },
    },
    user: {
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        userUpdateCalls.push({ userId: where.id, ...data });
        return {
          timezone: (data.timezone as string | undefined) ?? null,
          locale: (data.locale as string | undefined) ?? null,
          defaultCurrency: (data.defaultCurrency as string | undefined) ?? null,
          planningCadence: (data.planningCadence as string | undefined) ?? null,
        };
      },
    },
  };

  const prisma = {
    $queryRaw: async (...args: any[]) => {
      rawCalls.push(args);
      return remainingQueryResults.shift() ?? [];
    },
    $transaction: async (callback: (transactionClient: typeof tx) => Promise<unknown>) => callback(tx),
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
    transactionCalls,
    userUpdateCalls,
  };
}

test('updateWorkspaceSettings persists full payload to workspace and acting user preferences', async () => {
  const { service, transactionCalls, userUpdateCalls } = createServiceHarness({
    queryResults: [],
  });

  const result = await service.updateWorkspaceSettings('workspace-1', {
    name: 'Acme Operations',
    timezone: 'America/Chicago',
    locale: 'en-US',
    defaultCurrency: 'USD',
    planningCadence: 'biweekly',
    actingUserId: 'user-1',
  });

  assert.equal(transactionCalls.length, 1);
  assert.deepEqual(transactionCalls[0], {
    workspaceId: 'workspace-1',
    workspaceName: 'Acme Operations',
  });
  assert.equal(userUpdateCalls.length, 1);
  assert.deepEqual(userUpdateCalls[0], {
    userId: 'user-1',
    timezone: 'America/Chicago',
    locale: 'en-US',
    defaultCurrency: 'USD',
    planningCadence: 'biweekly',
  });
  assert.equal(result.name, 'Acme Operations');
  assert.equal(result.timezone, 'America/Chicago');
  assert.equal(result.locale, 'en-US');
  assert.equal(result.defaultCurrency, 'USD');
  assert.equal(result.planningCadence, 'biweekly');
});

test('updateWorkspaceSettings with name only still updates workspace and returns null preferences', async () => {
  const { service, transactionCalls, userUpdateCalls } = createServiceHarness({
    queryResults: [],
  });

  const result = await service.updateWorkspaceSettings('workspace-2', {
    name: 'Warehouse',
  });

  assert.equal(transactionCalls.length, 1);
  assert.equal(transactionCalls[0].workspaceName, 'Warehouse');
  assert.equal(userUpdateCalls.length, 0);
  assert.equal(result.name, 'Warehouse');
  assert.equal(result.timezone, null);
  assert.equal(result.locale, null);
  assert.equal(result.defaultCurrency, null);
  assert.equal(result.planningCadence, null);
});

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
