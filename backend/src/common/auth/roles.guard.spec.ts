import test from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PERMISSIONS_KEY } from './roles.decorator';
import { WorkspacePermissions } from '../../roles/roles.constants';

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => 'handler',
    getClass: () => class TestClass {},
  } as unknown as ExecutionContext;
}

function makeReflector(requiredPermissions: string[]): Reflector {
  return {
    getAllAndOverride: (metadataKey: string) => {
      if (metadataKey === PERMISSIONS_KEY) {
        return requiredPermissions;
      }

      return undefined;
    },
  } as unknown as Reflector;
}

test('roles guard allows a custom roleDefinition permission from workspace membership', () => {
  const guard = new RolesGuard(makeReflector([WorkspacePermissions.CatalogWrite]));
  const context = makeContext({
    workspaceId: 'ws-1',
    workspaceMember: {
      id: 'wm-1',
      role: 'VIEWER',
      roleDefinitionId: 'rd-custom',
      roleDefinition: {
        id: 'rd-custom',
        legacyRole: 'VIEWER',
        permissions: [WorkspacePermissions.CatalogWrite],
      },
    },
  });

  const result = guard.canActivate(context);

  assert.equal(result, true);
});

test('roles guard denies when required permission is not in defaults or roleDefinition permissions', () => {
  const guard = new RolesGuard(makeReflector([WorkspacePermissions.CatalogWrite]));
  const context = makeContext({
    workspaceId: 'ws-1',
    workspaceMember: {
      id: 'wm-1',
      role: 'VIEWER',
      roleDefinitionId: 'rd-custom',
      roleDefinition: {
        id: 'rd-custom',
        legacyRole: 'VIEWER',
        permissions: [WorkspacePermissions.CatalogRead],
      },
    },
  });

  assert.throws(() => guard.canActivate(context), ForbiddenException);
});
