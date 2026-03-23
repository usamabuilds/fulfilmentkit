import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { WorkspaceGuard } from './workspace.guard';

type RequestShape = {
  method: string;
  originalUrl: string;
  url: string;
  headers: Record<string, string>;
  auth?: {
    provider?: string;
    externalUserId?: string;
    email?: string;
  };
  user?: {
    id?: string;
    email?: string;
  };
  workspaceId?: string;
  workspaceMember?: {
    id: string;
    role: string;
    roleDefinitionId: string | null;
    roleDefinition: {
      id: string;
      legacyRole: string | null;
      permissions: unknown;
    } | null;
  };
  workspaceRole?: string;
};

type PrismaMock = {
  workspace: {
    findUnique: (args: unknown) => Promise<{ id: string } | null>;
  };
  user: {
    findUnique: (args: unknown) => Promise<{ id: string; authProvider: string; authProviderUserId: string } | null>;
    update: (
      args: unknown,
    ) => Promise<{ id: string; authProvider: string; authProviderUserId: string; email: string | null }>;
    create: (
      args: unknown,
    ) => Promise<{ id: string; authProvider: string; authProviderUserId: string; email: string | null }>;
  };
  workspaceMember: {
    findUnique: (args: unknown) => Promise<RequestShape['workspaceMember'] | null>;
  };
};

function makeContext(request: RequestShape): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
  } as ExecutionContext;
}

function makePrisma(overrides: Partial<PrismaMock> = {}): PrismaMock {
  return {
    workspace: {
      findUnique: async () => ({ id: 'ws-1' }),
      ...overrides.workspace,
    },
    user: {
      findUnique: async () => ({ id: 'db-user-1', authProvider: 'local', authProviderUserId: 'local-1' }),
      update: async () => ({
        id: 'db-user-1',
        authProvider: 'local',
        authProviderUserId: 'local-1',
        email: 'local@example.com',
      }),
      create: async () => ({
        id: 'db-user-created',
        authProvider: 'supabase',
        authProviderUserId: 'external-created',
        email: 'created@example.com',
      }),
      ...overrides.user,
    },
    workspaceMember: {
      findUnique: async () => ({
        id: 'wm-1',
        role: 'ADMIN',
        roleDefinitionId: null,
        roleDefinition: null,
      }),
      ...overrides.workspaceMember,
    },
  };
}

test('workspace guard resolves local user by provider-scoped identity', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/orders',
    url: '/orders',
    headers: { 'x-workspace-id': 'ws-1' },
    auth: {
      provider: 'local',
      externalUserId: 'same-uuid',
      email: 'local@example.com',
    },
  };

  let findUniqueArg: unknown;

  const prisma = makePrisma({
    user: {
      findUnique: async (args) => {
        findUniqueArg = args;
        return {
          id: 'internal-local-id',
          authProvider: 'local',
          authProviderUserId: 'same-uuid',
        };
      },
      update: async () => ({
        id: 'internal-local-id',
        authProvider: 'local',
        authProviderUserId: 'same-uuid',
        email: 'local@example.com',
      }),
      create: async () => {
        throw new Error('create should not be called for existing local user');
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.deepEqual(findUniqueArg, {
    where: {
      authProvider_authProviderUserId: {
        authProvider: 'local',
        authProviderUserId: 'same-uuid',
      },
    },
    select: {
      id: true,
      authProvider: true,
      authProviderUserId: true,
      email: true,
    },
  });
  assert.equal(request.user?.id, 'internal-local-id');
});

test('workspace guard creates supabase user when provider-scoped identity is missing', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/orders',
    url: '/orders',
    headers: { 'x-workspace-id': 'ws-1' },
    auth: {
      provider: 'supabase',
      externalUserId: 'supabase-uuid',
      email: 'supabase@example.com',
    },
  };

  let createArg: unknown;

  const prisma = makePrisma({
    user: {
      findUnique: async () => null,
      update: async () => {
        throw new Error('update should not be called when no user exists');
      },
      create: async (args) => {
        createArg = args;
        return {
          id: 'internal-supabase-id',
          authProvider: 'supabase',
          authProviderUserId: 'supabase-uuid',
          email: 'supabase@example.com',
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.deepEqual(createArg, {
    data: {
      authProvider: 'supabase',
      authProviderUserId: 'supabase-uuid',
      email: 'supabase@example.com',
    },
    select: {
      id: true,
      authProvider: true,
      authProviderUserId: true,
      email: true,
    },
  });
  assert.equal(request.user?.id, 'internal-supabase-id');
});

test('workspace guard allows same external UUID across different providers', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/orders',
    url: '/orders',
    headers: { 'x-workspace-id': 'ws-1' },
    auth: {
      provider: 'supabase',
      externalUserId: 'shared-uuid',
      email: 'shared@example.com',
    },
  };

  const seenFindUniqueArgs: unknown[] = [];

  const prisma = makePrisma({
    user: {
      findUnique: async (args) => {
        seenFindUniqueArgs.push(args);
        return null;
      },
      update: async () => {
        throw new Error('update should not be called when provider-scoped user does not exist');
      },
      create: async () => ({
        id: 'internal-supabase-shared',
        authProvider: 'supabase',
        authProviderUserId: 'shared-uuid',
        email: 'shared@example.com',
      }),
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.equal(seenFindUniqueArgs.length, 1);
  assert.deepEqual(seenFindUniqueArgs[0], {
    where: {
      authProvider_authProviderUserId: {
        authProvider: 'supabase',
        authProviderUserId: 'shared-uuid',
      },
    },
    select: {
      id: true,
      authProvider: true,
      authProviderUserId: true,
      email: true,
    },
  });
  assert.equal(request.user?.id, 'internal-supabase-shared');
});

test('workspace guard requires identity and enforces membership using resolved DB user id', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/orders',
    url: '/orders',
    headers: { 'x-workspace-id': 'ws-1' },
    auth: {
      provider: 'supabase',
      externalUserId: 'external-user-1',
      email: 'member@example.com',
    },
  };

  let membershipLookupArg: unknown;

  const prisma = makePrisma({
    user: {
      findUnique: async () => ({
        id: 'db-user-42',
        authProvider: 'supabase',
        authProviderUserId: 'external-user-1',
      }),
      update: async () => ({
        id: 'db-user-42',
        authProvider: 'supabase',
        authProviderUserId: 'external-user-1',
        email: 'member@example.com',
      }),
      create: async () => {
        throw new Error('create should not be called when identity resolves to an existing user');
      },
    },
    workspaceMember: {
      findUnique: async (args) => {
        membershipLookupArg = args;
        return {
          id: 'wm-42',
          role: 'ADMIN',
          roleDefinitionId: 'rd-42',
          roleDefinition: {
            id: 'rd-42',
            legacyRole: 'ADMIN',
            permissions: ['orders.read', 'orders.write'],
          },
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.ok(request.user?.id, 'identity-required flow should always resolve a non-null user id');
  assert.equal(request.user?.id, 'db-user-42');
  assert.deepEqual(membershipLookupArg, {
    where: {
      workspaceId_userId: {
        workspaceId: 'ws-1',
        userId: 'db-user-42',
      },
    },
    select: {
      id: true,
      role: true,
      roleDefinitionId: true,
      roleDefinition: {
        select: {
          id: true,
          legacyRole: true,
          permissions: true,
        },
      },
    },
  });
  assert.deepEqual(request.workspaceMember, {
    id: 'wm-42',
    role: 'ADMIN',
    roleDefinitionId: 'rd-42',
    roleDefinition: {
      id: 'rd-42',
      legacyRole: 'ADMIN',
      permissions: ['orders.read', 'orders.write'],
    },
  });
  assert.equal(request.workspaceRole, 'ADMIN');
});

test('workspace guard allows GET /me without workspace header and does not resolve membership', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/me',
    url: '/me',
    headers: {},
    auth: {
      provider: 'local',
      externalUserId: 'me-user-1',
      email: 'me@example.com',
    },
  };

  let membershipLookups = 0;

  const prisma = makePrisma({
    workspaceMember: {
      findUnique: async () => {
        membershipLookups += 1;
        return {
          id: 'wm-unexpected',
          role: 'OWNER',
          roleDefinitionId: null,
          roleDefinition: null,
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.equal(membershipLookups, 0);
  assert.equal(request.workspaceId, undefined);
  assert.equal(request.workspaceRole, undefined);
});

test('workspace guard ignores X-Workspace-Id for GET /me and keeps workspaceRole unset', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/me',
    url: '/me',
    headers: { 'x-workspace-id': 'ws-1' },
    auth: {
      provider: 'local',
      externalUserId: 'me-user-2',
      email: 'me2@example.com',
    },
  };

  let membershipLookups = 0;

  const prisma = makePrisma({
    workspaceMember: {
      findUnique: async () => {
        membershipLookups += 1;
        return {
          id: 'wm-unexpected',
          role: 'OWNER',
          roleDefinitionId: null,
          roleDefinition: null,
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);

  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.equal(membershipLookups, 0);
  assert.equal(request.workspaceId, undefined);
  assert.equal(request.workspaceRole, undefined);
});

test('workspace guard allows unauthenticated GET /connections/xero/callback', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/connections/xero/callback',
    url: '/connections/xero/callback?code=abc&state=xyz',
    headers: {},
  };

  let workspaceLookups = 0;
  let membershipLookups = 0;

  const prisma = makePrisma({
    workspace: {
      findUnique: async () => {
        workspaceLookups += 1;
        return { id: 'ws-unexpected' };
      },
    },
    workspaceMember: {
      findUnique: async () => {
        membershipLookups += 1;
        return {
          id: 'wm-unexpected',
          role: 'OWNER',
          roleDefinitionId: null,
          roleDefinition: null,
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);
  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.equal(workspaceLookups, 0);
  assert.equal(membershipLookups, 0);
});

test('workspace guard allows unauthenticated GET /connections/zoho/callback', async () => {
  const request: RequestShape = {
    method: 'GET',
    originalUrl: '/connections/zoho/callback',
    url: '/connections/zoho/callback?code=abc&state=xyz',
    headers: {},
  };

  let workspaceLookups = 0;
  let membershipLookups = 0;

  const prisma = makePrisma({
    workspace: {
      findUnique: async () => {
        workspaceLookups += 1;
        return { id: 'ws-unexpected' };
      },
    },
    workspaceMember: {
      findUnique: async () => {
        membershipLookups += 1;
        return {
          id: 'wm-unexpected',
          role: 'OWNER',
          roleDefinitionId: null,
          roleDefinition: null,
        };
      },
    },
  });

  const guard = new WorkspaceGuard(prisma as never);
  const result = await guard.canActivate(makeContext(request));

  assert.equal(result, true);
  assert.equal(workspaceLookups, 0);
  assert.equal(membershipLookups, 0);
});
