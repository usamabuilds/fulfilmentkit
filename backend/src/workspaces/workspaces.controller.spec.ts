import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';

class WorkspacesServiceMock {
  public readonly calls: string[] = [];

  async listWorkspacesForUser(userId: string) {
    this.calls.push(userId);

    if (userId === 'user-1') {
      return [
        { id: 'ws-a', name: 'Workspace A' },
        { id: 'ws-b', name: 'Workspace B' },
      ];
    }

    return [];
  }
}

test('GET /workspaces without authenticated user throws 401 UnauthorizedException', async () => {
  const service = new WorkspacesServiceMock();
  const controller = new WorkspacesController(service as any);

  await assert.rejects(
    async () => controller.list({ user: undefined }),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      return true;
    },
  );

  assert.equal(service.calls.length, 0);
});

test('GET /workspaces with authenticated user returns only caller memberships', async () => {
  const service = new WorkspacesServiceMock();
  const controller = new WorkspacesController(service as any);

  const response = await controller.list({ user: { id: 'user-1' } });

  assert.deepEqual(service.calls, ['user-1']);
  assert.deepEqual(response, {
    success: true,
    data: {
      items: [
        { id: 'ws-a', name: 'Workspace A' },
        { id: 'ws-b', name: 'Workspace B' },
      ],
      total: 2,
      page: 1,
      pageSize: 2,
    },
  });
});
