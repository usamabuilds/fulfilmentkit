import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';

function createServiceWithMembershipsResult(
  result: Array<{ workspace: { id: string; name: string } }>,
) {
  const findManyCalls: any[] = [];

  const prisma = {
    workspaceMember: {
      findMany: async (args: any) => {
        findManyCalls.push(args);
        return result;
      },
    },
  };

  return {
    service: new WorkspacesService(prisma as any),
    findManyCalls,
  };
}

test('listWorkspacesForUser rejects invalid user id input', async () => {
  const { service } = createServiceWithMembershipsResult([]);

  await assert.rejects(
    async () => service.listWorkspacesForUser(''),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    },
  );

  await assert.rejects(
    async () => service.listWorkspacesForUser('   '),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    },
  );
});

test('listWorkspacesForUser queries memberships by caller user id and returns those workspaces', async () => {
  const { service, findManyCalls } = createServiceWithMembershipsResult([
    { workspace: { id: 'ws-a', name: 'Workspace A' } },
    { workspace: { id: 'ws-b', name: 'Workspace B' } },
  ]);

  const workspaces = await service.listWorkspacesForUser('user-1');

  assert.equal(findManyCalls.length, 1);
  assert.equal(findManyCalls[0].where.userId, 'user-1');
  assert.deepEqual(workspaces, [
    { id: 'ws-a', name: 'Workspace A' },
    { id: 'ws-b', name: 'Workspace B' },
  ]);
});
