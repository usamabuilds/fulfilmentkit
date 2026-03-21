import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import type { ConnectionPlatform } from '../generated/prisma';

type ConnectionUpsertCall = {
  where: { workspaceId_platform: { workspaceId: string; platform: ConnectionPlatform } };
};

type ConnectionFindFirstCall = {
  where: {
    id: string;
    workspaceId: string;
    platform: ConnectionPlatform;
  };
};

type ConnectionSecretUpsertCall = {
  where: { connectionId: string };
  create: {
    connectionId: string;
    workspaceId: string;
    platform: ConnectionPlatform;
    authType: string;
    secretCiphertext: Buffer;
    secretMetadata: Record<string, unknown>;
  };
  update: {
    connectionId?: string;
    workspaceId: string;
    platform: ConnectionPlatform;
    authType: string;
    secretCiphertext: Buffer;
    secretMetadata: Record<string, unknown>;
  };
};

type ConnectionUpdateCall = {
  where: { id: string };
  data: { status: string; lastError: string | null };
};

type ShopifyStateVerifier = {
  verifyShopifyOAuthState(args: { state: unknown; shop: unknown }): {
    workspaceId: string;
    connectionId: string;
    shop: string;
    iat: number;
    exp: number;
    nonce: string;
  };
};

function signShopifyState(payload: Record<string, unknown>, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function createService() {
  const connectionUpsertCalls: Array<Record<string, unknown>> = [];
  const connectionFindFirstCalls: Array<Record<string, unknown>> = [];
  const connectionSecretUpsertCalls: Array<Record<string, unknown>> = [];
  const connectionUpdateCalls: Array<Record<string, unknown>> = [];

  const prisma = {
    connection: {
      upsert: async (args: Record<string, unknown>) => {
        connectionUpsertCalls.push(args);
        const where = args.where as {
          workspaceId_platform: {
            workspaceId: string;
            platform: ConnectionPlatform;
          };
        };

        return {
          id: 'conn-1',
          workspaceId: where.workspaceId_platform.workspaceId,
          platform: where.workspaceId_platform.platform,
          status: 'DISCONNECTED',
        };
      },
      findFirst: async (args: Record<string, unknown>) => {
        connectionFindFirstCalls.push(args);
        return {
          id: 'conn-1',
          platform: 'SHOPIFY',
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
    connectionFindFirstCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  };
}

test('startConnectionFlow returns composed Shopify authorize URL from env', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.CONNECTION_OAUTH_STATE_KEY = 'state-secret-12345678901234567890';
  process.env.SHOPIFY_CLIENT_ID = 'shopify-client-id';
  process.env.SHOPIFY_SCOPES = 'read_orders,write_products';
  process.env.SHOPIFY_REDIRECT_URI = 'https://api.example.com/connections/shopify/callback';

  const { service, connectionUpsertCalls } = createService();

  const result = await service.startConnectionFlow({
    workspaceId: 'ws-1',
    platform: 'shopify',
    payload: { shop: 'Demo-Store.myshopify.com' },
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-1',
    platform: 'SHOPIFY',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'auth_url');
  if (result.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const oauthUrl = new URL(result.data.url);
  assert.equal(oauthUrl.origin, 'https://demo-store.myshopify.com');
  assert.equal(oauthUrl.pathname, '/admin/oauth/authorize');
  assert.equal(oauthUrl.searchParams.get('client_id'), 'shopify-client-id');
  assert.equal(oauthUrl.searchParams.get('scope'), 'read_orders,write_products');
  assert.equal(
    oauthUrl.searchParams.get('redirect_uri'),
    'https://api.example.com/connections/shopify/callback',
  );
  assert.ok(oauthUrl.searchParams.get('state'));
});

test('startConnectionFlow rejects malformed Shopify shop domains', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.CONNECTION_OAUTH_STATE_KEY = 'state-secret-12345678901234567890';
  process.env.SHOPIFY_CLIENT_ID = 'shopify-client-id';
  process.env.SHOPIFY_SCOPES = 'read_orders';
  process.env.SHOPIFY_REDIRECT_URI = 'https://api.example.com/callback';

  const { service } = createService();

  await assert.rejects(
    () =>
      service.startConnectionFlow({
        workspaceId: 'ws-1',
        platform: 'shopify',
        payload: { shop: 'https://demo.myshopify.com' },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(
        badRequestError.message,
        'shop must be a plain myshopify domain (e.g. mystore.myshopify.com)',
      );
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.startConnectionFlow({
        workspaceId: 'ws-1',
        platform: 'shopify',
        payload: { shop: 'not-a-shop' },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(badRequestError.message, 'shop must match *.myshopify.com');
      return true;
    },
  );
});

test('startConnectionFlow for WooCommerce keeps start non-OAuth and only returns callback completion instructions', async () => {
  const { service, connectionUpsertCalls } = createService();

  const result = await service.startConnectionFlow({
    workspaceId: 'ws-woo',
    platform: 'woocommerce',
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-woo',
    platform: 'WOOCOMMERCE',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'instructions');
  if (result.data.type !== 'instructions') {
    assert.fail('Expected instructions response');
  }

  assert.equal(result.data.title, 'Connect WooCommerce with API keys');
  assert.ok(
    result.data.steps.some((step) => step.includes('POST /connections/woocommerce/callback')),
  );
  assert.equal(
    result.data.message,
    'WooCommerce uses API key credentials for this flow; start only initializes the connection record.',
  );
});

test('Shopify OAuth state signing verifies and expiration is enforced', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.CONNECTION_OAUTH_STATE_KEY = 'state-secret-12345678901234567890';
  process.env.SHOPIFY_CLIENT_ID = 'shopify-client-id';
  process.env.SHOPIFY_SCOPES = 'read_orders';
  process.env.SHOPIFY_REDIRECT_URI = 'https://api.example.com/callback';

  const originalNow = Date.now;
  Date.now = () => new Date('2026-03-21T10:00:00.000Z').getTime();

  const { service } = createService();
  const verifier = service as unknown as ShopifyStateVerifier;

  const startResult = await service.startConnectionFlow({
    workspaceId: 'ws-state',
    platform: 'shopify',
    payload: { shop: 'state-shop.myshopify.com' },
  });

  assert.equal(startResult.data.type, 'auth_url');
  if (startResult.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(startResult.data.url).searchParams.get('state');
  assert.ok(state);

  const verified = verifier.verifyShopifyOAuthState({
    state,
    shop: 'state-shop.myshopify.com',
  });

  assert.equal(verified.workspaceId, 'ws-state');
  assert.equal(verified.connectionId, 'conn-1');
  assert.equal(verified.shop, 'state-shop.myshopify.com');

  const expiredPayload = {
    workspaceId: 'ws-state',
    connectionId: 'conn-1',
    shop: 'state-shop.myshopify.com',
    iat: Math.floor(Date.now() / 1000) - 120,
    exp: Math.floor(Date.now() / 1000) - 1,
    nonce: 'nonce-expired',
  };
  const expiredState = signShopifyState(
    expiredPayload,
    process.env.CONNECTION_OAUTH_STATE_KEY as string,
  );

  await assert.rejects(
    () =>
      Promise.resolve(
        verifier.verifyShopifyOAuthState({
          state: expiredState,
          shop: 'state-shop.myshopify.com',
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(badRequestError.message, 'Shopify OAuth state expired');
      return true;
    },
  );

  Date.now = originalNow;
});

test('handleCallback token exchange success stores encrypted secret and activates connection', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.CONNECTION_OAUTH_STATE_KEY = 'state-secret-12345678901234567890';
  process.env.SHOPIFY_CLIENT_ID = 'shopify-client-id';
  process.env.SHOPIFY_CLIENT_SECRET = 'shopify-client-secret';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'shpat_test_access_token',
        scope: 'read_orders,write_products',
        associated_user_scope: 'read_orders',
        token_type: 'offline',
      }),
    }) as Response) as typeof fetch;

  const {
    service,
    connectionFindFirstCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const state = signShopifyState(
    {
      workspaceId: 'ws-shopify',
      connectionId: 'conn-1',
      shop: 'demo-shop.myshopify.com',
      iat: nowSeconds,
      exp: nowSeconds + 600,
      nonce: 'nonce-1',
    },
    process.env.CONNECTION_OAUTH_STATE_KEY as string,
  );

  const result = await service.handleCallback({
    workspaceId: 'ignored-by-state',
    platform: 'shopify',
    payload: {
      state,
      shop: 'demo-shop.myshopify.com',
      code: 'oauth-code',
      hmac: 'from-shopify',
    },
  });

  assert.equal(connectionFindFirstCalls.length, 1);
  const findFirstCall = connectionFindFirstCalls[0] as ConnectionFindFirstCall;
  assert.deepEqual(findFirstCall.where, {
    id: 'conn-1',
    workspaceId: 'ws-shopify',
    platform: 'SHOPIFY',
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-shopify');
  assert.equal(secretUpsertCall.create.platform, 'SHOPIFY');
  assert.equal(secretUpsertCall.create.authType, 'oauth_callback');
  assert.ok(Buffer.isBuffer(secretUpsertCall.create.secretCiphertext));
  assert.notEqual(
    secretUpsertCall.create.secretCiphertext.toString('utf8'),
    'shpat_test_access_token',
  );

  const metadata = secretUpsertCall.create.secretMetadata;
  assert.equal(metadata.alg, 'aes-256-gcm');
  assert.equal(metadata.v, 1);
  assert.equal(metadata.shop, 'demo-shop.myshopify.com');
  assert.deepEqual(metadata.scopes, ['read_orders', 'write_products']);
  assert.deepEqual(metadata.associatedUserScopes, ['read_orders']);
  assert.equal(metadata.tokenType, 'offline');
  assert.ok(typeof metadata.receivedAt === 'string');

  assert.equal(connectionUpdateCalls.length, 1);
  const updateCall = connectionUpdateCalls[0] as ConnectionUpdateCall;
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

  global.fetch = originalFetch;
});

test('handleCallback token exchange failure marks connection as error and stores no plaintext secret', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.CONNECTION_OAUTH_STATE_KEY = 'state-secret-12345678901234567890';
  process.env.SHOPIFY_CLIENT_ID = 'shopify-client-id';
  process.env.SHOPIFY_CLIENT_SECRET = 'shopify-client-secret';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'invalid_code',
        error_description: 'Authorization code invalid',
      }),
    }) as Response) as typeof fetch;

  const {
    service,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const state = signShopifyState(
    {
      workspaceId: 'ws-error',
      connectionId: 'conn-1',
      shop: 'demo-shop.myshopify.com',
      iat: nowSeconds,
      exp: nowSeconds + 600,
      nonce: 'nonce-2',
    },
    process.env.CONNECTION_OAUTH_STATE_KEY as string,
  );

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ignored-by-state',
        platform: 'shopify',
        payload: {
          state,
          shop: 'demo-shop.myshopify.com',
          code: 'bad-code',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.match(badRequestError.message, /Shopify token exchange failed with status 401/);
      return true;
    },
  );

  assert.equal(connectionSecretUpsertCalls.length, 0);
  assert.equal(connectionUpdateCalls.length, 1);

  const updateCall = connectionUpdateCalls[0] as ConnectionUpdateCall;
  assert.equal(updateCall.where.id, 'conn-1');
  assert.equal(updateCall.data.status, 'ERROR');
  assert.match(updateCall.data.lastError ?? '', /Shopify token exchange failed with status 401/);
  assert.doesNotMatch(updateCall.data.lastError ?? '', /bad-code|access_token|shpat/i);

  global.fetch = originalFetch;
});
