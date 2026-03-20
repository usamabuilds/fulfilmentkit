import assert from 'node:assert/strict';
import test from 'node:test';
import { ConnectionsService } from './connections.service';
import type { ConnectionPlatform } from '../generated/prisma';

type ConnectionUpsertCall = {
  where: { workspaceId_platform: { workspaceId: string; platform: ConnectionPlatform } };
};

type ConnectionSecretUpsertCall = {
  where: { connectionId: string };
  create: { workspaceId: string; platform: ConnectionPlatform; authType: string };
  update: { workspaceId: string; platform: ConnectionPlatform; authType: string };
};

type ConnectionUpdateCall = {
  where: { id: string };
  data: { status: string; lastError: null };
};

function createService() {
  const connectionUpsertCalls: Array<Record<string, unknown>> = [];
  const connectionSecretUpsertCalls: Array<Record<string, unknown>> = [];
  const connectionUpdateCalls: Array<Record<string, unknown>> = [];

  const prisma = {
    connection: {
      upsert: async (args: Record<string, unknown>) => {
        connectionUpsertCalls.push(args);
        const where = args.where as {
          workspaceId_platform: { platform: ConnectionPlatform };
        };
        return {
          id: 'conn-1',
          platform: where.workspaceId_platform.platform,
          status: 'DISCONNECTED',
        };
      },
      update: async (args: Record<string, unknown>) => {
        connectionUpdateCalls.push(args);
        const where = args.where as { id: string };
        return { id: where.id };
      },
    },
    connectionSecret: {
      upsert: async (args: Record<string, unknown>) => {
        connectionSecretUpsertCalls.push(args);
        return { id: 'secret-1' };
      },
    },
  };

  const syncQueue = {
    add: async () => ({ id: 'job-1' }),
  };

  return {
    service: new ConnectionsService(prisma as never, syncQueue as never),
    connectionUpsertCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  };
}

test('handleCallback creates first connection for workspace + platform and stores secret', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const {
    service,
    connectionUpsertCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const result = await service.handleCallback({
    workspaceId: 'ws-new',
    platform: 'shopify',
    payload: { code: 'oauth-code', shop: 'demo-shop' },
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as unknown as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-new',
    platform: 'SHOPIFY' satisfies ConnectionPlatform,
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as unknown as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-new');
  assert.equal(secretUpsertCall.create.platform, 'SHOPIFY');
  assert.equal(secretUpsertCall.create.authType, 'oauth_callback');

  assert.equal(connectionUpdateCalls.length, 1);
  const updateCall = connectionUpdateCalls[0] as unknown as ConnectionUpdateCall;
  assert.deepEqual(updateCall.data, {
    status: 'ACTIVE',
    lastError: null,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      connectionId: 'conn-1',
      platform: 'shopify',
      stored: true,
      status: 'connected',
    },
  });
  assert.equal('secretCiphertext' in result.data, false);
});

test('handleCallback existing connection path still stores secret and activates connection', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const {
    service,
    connectionUpsertCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  await service.handleCallback({
    workspaceId: 'ws-existing',
    platform: 'woocommerce',
    payload: { consumerKey: 'ck_x', consumerSecret: 'cs_y' },
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const existingUpsertCall = connectionUpsertCalls[0] as unknown as ConnectionUpsertCall;
  assert.deepEqual(existingUpsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-existing',
    platform: 'WOOCOMMERCE' satisfies ConnectionPlatform,
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const existingSecretCall = connectionSecretUpsertCalls[0] as unknown as ConnectionSecretUpsertCall;
  assert.equal(existingSecretCall.update.workspaceId, 'ws-existing');
  assert.equal(existingSecretCall.update.platform, 'WOOCOMMERCE');
  assert.equal(existingSecretCall.update.authType, 'api_keys_callback');

  assert.equal(connectionUpdateCalls.length, 1);
  const existingUpdateCall = connectionUpdateCalls[0] as unknown as ConnectionUpdateCall;
  assert.equal(existingUpdateCall.where.id, 'conn-1');
});

test('handleCallback duplicate/concurrent callbacks are safe with unique key + upsert', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const {
    service,
    connectionUpsertCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  await Promise.all([
    service.handleCallback({
      workspaceId: 'ws-concurrent',
      platform: 'shopify',
      payload: { code: 'first' },
    }),
    service.handleCallback({
      workspaceId: 'ws-concurrent',
      platform: 'shopify',
      payload: { code: 'second' },
    }),
  ]);

  assert.equal(connectionUpsertCalls.length, 2);
  assert.equal(connectionSecretUpsertCalls.length, 2);
  assert.equal(connectionUpdateCalls.length, 2);

  for (const call of connectionSecretUpsertCalls) {
    const secretCall = call as unknown as ConnectionSecretUpsertCall;
    assert.equal(secretCall.where.connectionId, 'conn-1');
  }

  for (const call of connectionUpsertCalls) {
    const upsertConcurrencyCall = call as unknown as ConnectionUpsertCall;
    assert.deepEqual(upsertConcurrencyCall.where.workspaceId_platform, {
      workspaceId: 'ws-concurrent',
      platform: 'SHOPIFY' satisfies ConnectionPlatform,
    });
  }
});
