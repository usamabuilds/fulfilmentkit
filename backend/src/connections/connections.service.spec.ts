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
  const encodedPayload = Buffer.from(
    JSON.stringify({
      platform: 'shopify',
      ...payload,
    }),
    'utf8',
  ).toString('base64url');
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
  const oauthStates = new Map<
    string,
    {
      workspaceId: string;
      connectionId: string;
      platform: ConnectionPlatform;
      expiresAt: Date;
      usedAt: Date | null;
    }
  >();

  const prisma = {
    $executeRaw: async (
      _strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const workspaceId = values[1] as string;
      const connectionId = values[2] as string;
      const platform = values[3] as ConnectionPlatform;
      const stateHash = values[4] as string;
      const expiresAt = values[5] as Date;

      oauthStates.set(`${platform}:${stateHash}`, {
        workspaceId,
        connectionId,
        platform,
        expiresAt,
        usedAt: null,
      });

      return 1;
    },
    $queryRaw: async (
      _strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<Array<{ workspaceId: string; connectionId: string }>> => {
      const stateHash = values[0] as string;
      const platform = values[1] as ConnectionPlatform;
      const state = oauthStates.get(`${platform}:${stateHash}`);

      if (!state || state.usedAt || state.expiresAt.getTime() <= Date.now()) {
        return [];
      }

      state.usedAt = new Date();
      return [{
        workspaceId: state.workspaceId,
        connectionId: state.connectionId,
      }];
    },
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
    oauthStates,
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

test('startConnectionFlow returns composed Xero authorize URL from env', async () => {
  process.env.XERO_CLIENT_ID = 'xero-client-id';
  process.env.XERO_REDIRECT_URI = 'https://api.example.com/connections/xero/callback';
  process.env.XERO_SCOPES = 'openid profile accounting.transactions';

  const { service, connectionUpsertCalls } = createService();

  const result = await service.startConnectionFlow({
    workspaceId: 'ws-xero',
    platform: 'xero',
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-xero',
    platform: 'XERO',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'auth_url');
  if (result.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const authUrl = new URL(result.data.url);
  assert.equal(authUrl.origin, 'https://login.xero.com');
  assert.equal(authUrl.pathname, '/identity/connect/authorize');
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('client_id'), 'xero-client-id');
  assert.equal(
    authUrl.searchParams.get('redirect_uri'),
    'https://api.example.com/connections/xero/callback',
  );
  assert.equal(authUrl.searchParams.get('scope'), 'openid profile accounting.transactions');
  assert.ok(authUrl.searchParams.get('state'));
});

test('startConnectionFlow returns composed Zoho authorize URL when env vars exist', async () => {
  process.env.ZOHO_CLIENT_ID = 'zoho-client-id';
  process.env.ZOHO_REDIRECT_URI = 'https://api.example.com/connections/zoho/callback';
  process.env.ZOHO_SCOPES = 'ZohoInventory.items.READ,ZohoInventory.settings.READ';

  const { service, connectionUpsertCalls } = createService();

  const result = await service.startConnectionFlow({
    workspaceId: 'ws-zoho',
    platform: 'zoho',
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-zoho',
    platform: 'ZOHO',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'auth_url');
  if (result.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const authUrl = new URL(result.data.url);
  assert.equal(authUrl.origin, 'https://accounts.zoho.com');
  assert.equal(authUrl.pathname, '/oauth/v2/auth');
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('client_id'), 'zoho-client-id');
  assert.equal(
    authUrl.searchParams.get('redirect_uri'),
    'https://api.example.com/connections/zoho/callback',
  );
  assert.equal(
    authUrl.searchParams.get('scope'),
    'ZohoInventory.items.READ,ZohoInventory.settings.READ',
  );
  assert.equal(authUrl.searchParams.get('access_type'), 'offline');
  assert.ok(authUrl.searchParams.get('state'));
});

test('startConnectionFlow returns composed QuickBooks authorize URL from env and includes state', async () => {
  process.env.QUICKBOOKS_CLIENT_ID = 'quickbooks-client-id';
  process.env.QUICKBOOKS_REDIRECT_URI = 'https://api.example.com/connections/quickbooks/callback';
  process.env.QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';
  process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

  const { service, connectionUpsertCalls } = createService();

  const result = await service.startConnectionFlow({
    workspaceId: 'ws-qb',
    platform: 'quickbooks',
  });

  assert.equal(connectionUpsertCalls.length, 1);
  const upsertCall = connectionUpsertCalls[0] as ConnectionUpsertCall;
  assert.deepEqual(upsertCall.where.workspaceId_platform, {
    workspaceId: 'ws-qb',
    platform: 'QUICKBOOKS',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.type, 'auth_url');
  if (result.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const authUrl = new URL(result.data.url);
  assert.equal(authUrl.origin, 'https://sandbox.appcenter.intuit.com');
  assert.equal(authUrl.pathname, '/connect/oauth2');
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('client_id'), 'quickbooks-client-id');
  assert.equal(
    authUrl.searchParams.get('redirect_uri'),
    'https://api.example.com/connections/quickbooks/callback',
  );
  assert.equal(authUrl.searchParams.get('scope'), 'com.intuit.quickbooks.accounting');
  assert.ok(authUrl.searchParams.get('state'));
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

  assert.throws(
    () =>
      verifier.verifyShopifyOAuthState({
        state: expiredState,
        shop: 'state-shop.myshopify.com',
      }),
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

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-shopify',
    platform: 'shopify',
    payload: { shop: 'demo-shop.myshopify.com' },
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

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

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-error',
    platform: 'shopify',
    payload: { shop: 'demo-shop.myshopify.com' },
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

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

test('handleCallback for Xero rejects missing, invalid, expired, and reused OAuth state', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.XERO_CLIENT_ID = 'xero-client-id';
  process.env.XERO_REDIRECT_URI = 'https://api.example.com/connections/xero/callback';
  process.env.XERO_SCOPES = 'openid profile accounting.transactions';
  process.env.XERO_CLIENT_SECRET = 'xero-client-secret';

  const originalFetch = global.fetch;
  const originalNow = Date.now;

  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'xero-access-token',
        refresh_token: 'xero-refresh-token',
        expires_in: 1800,
        scope: 'openid profile accounting.transactions',
        token_type: 'Bearer',
      }),
    }) as Response) as typeof fetch;

  const { service } = createService();
  const started = await service.startConnectionFlow({
    workspaceId: 'ws-xero-invalid',
    platform: 'xero',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-xero-invalid',
        platform: 'xero',
        payload: {
          code: 'xero-code',
        },
      }),
    /Missing OAuth state/,
  );

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-xero-invalid',
        platform: 'xero',
        payload: {
          code: 'xero-code',
          state: 'not-a-valid-state',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = () => originalNow() + 11 * 60 * 1000;
  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-xero-invalid',
        platform: 'xero',
        payload: {
          code: 'xero-code',
          state,
          connectionId: 'conn-1',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );
  Date.now = originalNow;

  const startedForReuse = await service.startConnectionFlow({
    workspaceId: 'ws-xero-reuse',
    platform: 'xero',
  });
  assert.equal(startedForReuse.data.type, 'auth_url');
  if (startedForReuse.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const reusableState = new URL(startedForReuse.data.url).searchParams.get('state');
  assert.ok(reusableState);

  await service.handleCallback({
    workspaceId: 'ws-xero-reuse',
    platform: 'xero',
    payload: {
      code: 'xero-code',
      state: reusableState,
      connectionId: 'conn-1',
    },
  });

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-xero-reuse',
        platform: 'xero',
        payload: {
          code: 'xero-code',
          state: reusableState,
          connectionId: 'conn-1',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = originalNow;
  global.fetch = originalFetch;
});

test('handleCallback for Zoho rejects missing, invalid, expired, and reused OAuth state', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.ZOHO_CLIENT_ID = 'zoho-client-id';
  process.env.ZOHO_REDIRECT_URI = 'https://api.example.com/connections/zoho/callback';
  process.env.ZOHO_SCOPES = 'ZohoInventory.items.READ,ZohoInventory.settings.READ';
  process.env.ZOHO_CLIENT_SECRET = 'zoho-client-secret';

  const originalFetch = global.fetch;
  const originalNow = Date.now;

  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'zoho-access-token',
        refresh_token: 'zoho-refresh-token',
        expires_in_sec: 3600,
        token_type: 'Bearer',
        scope: 'ZohoInventory.items.READ,ZohoInventory.settings.READ',
      }),
    }) as Response) as typeof fetch;

  const { service } = createService();
  const started = await service.startConnectionFlow({
    workspaceId: 'ws-zoho-invalid',
    platform: 'zoho',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-zoho-invalid',
        platform: 'zoho',
        payload: {
          code: 'zoho-code',
        },
      }),
    /Missing OAuth state/,
  );

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-zoho-invalid',
        platform: 'zoho',
        payload: {
          code: 'zoho-code',
          state: 'not-a-valid-state',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = () => originalNow() + 11 * 60 * 1000;
  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-zoho-invalid',
        platform: 'zoho',
        payload: {
          code: 'zoho-code',
          state,
          connectionId: 'conn-1',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );
  Date.now = originalNow;

  const startedForReuse = await service.startConnectionFlow({
    workspaceId: 'ws-zoho-reuse',
    platform: 'zoho',
  });
  assert.equal(startedForReuse.data.type, 'auth_url');
  if (startedForReuse.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const reusableState = new URL(startedForReuse.data.url).searchParams.get('state');
  assert.ok(reusableState);

  await service.handleCallback({
    workspaceId: 'ws-zoho-reuse',
    platform: 'zoho',
    payload: {
      code: 'zoho-code',
      state: reusableState,
      connectionId: 'conn-1',
    },
  });

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-zoho-reuse',
        platform: 'zoho',
        payload: {
          code: 'zoho-code',
          state: reusableState,
          connectionId: 'conn-1',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = originalNow;
  global.fetch = originalFetch;
});

test('handleCallback for QuickBooks rejects missing, invalid, expired, and reused OAuth state', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.QUICKBOOKS_CLIENT_ID = 'quickbooks-client-id';
  process.env.QUICKBOOKS_CLIENT_SECRET = 'quickbooks-client-secret';
  process.env.QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';
  process.env.QUICKBOOKS_REDIRECT_URI = 'https://api.example.com/connections/quickbooks/callback';
  process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

  const originalFetch = global.fetch;
  const originalNow = Date.now;

  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8640000,
        token_type: 'Bearer',
        scope: 'com.intuit.quickbooks.accounting',
      }),
    }) as Response) as typeof fetch;

  const { service } = createService();
  const started = await service.startConnectionFlow({
    workspaceId: 'ws-qb-invalid',
    platform: 'quickbooks',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }

  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-qb-invalid',
        platform: 'quickbooks',
        payload: {
          code: 'qb-code',
          realmId: '1234567890',
        },
      }),
    /Missing OAuth state/,
  );

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-qb-invalid',
        platform: 'quickbooks',
        payload: {
          code: 'qb-code',
          state: 'not-a-valid-state',
          realmId: '1234567890',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = () => originalNow() + 11 * 60 * 1000;
  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-qb-invalid',
        platform: 'quickbooks',
        payload: {
          code: 'qb-code',
          state,
          connectionId: 'conn-1',
          realmId: '1234567890',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );
  Date.now = originalNow;

  const startedForReuse = await service.startConnectionFlow({
    workspaceId: 'ws-qb-reuse',
    platform: 'quickbooks',
  });
  assert.equal(startedForReuse.data.type, 'auth_url');
  if (startedForReuse.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const reusableState = new URL(startedForReuse.data.url).searchParams.get('state');
  assert.ok(reusableState);

  await service.handleCallback({
    workspaceId: 'ws-qb-reuse',
    platform: 'quickbooks',
    payload: {
      code: 'qb-code',
      state: reusableState,
      connectionId: 'conn-1',
      realmId: '1234567890',
    },
  });

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-qb-reuse',
        platform: 'quickbooks',
        payload: {
          code: 'qb-code',
          state: reusableState,
          connectionId: 'conn-1',
          realmId: '1234567890',
        },
      }),
    /Invalid, expired, or already-used OAuth state/,
  );

  Date.now = originalNow;
  global.fetch = originalFetch;
});

test('handleCallback for Zoho success exchanges code, upserts encrypted secret, and sets ACTIVE status', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.ZOHO_CLIENT_ID = 'zoho-client-id';
  process.env.ZOHO_REDIRECT_URI = 'https://api.example.com/connections/zoho/callback';
  process.env.ZOHO_SCOPES = 'ZohoInventory.items.READ,ZohoInventory.settings.READ';
  process.env.ZOHO_CLIENT_SECRET = 'zoho-client-secret';

  const originalFetch = global.fetch;
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'zoho-access-token',
        refresh_token: 'zoho-refresh-token',
        expires_in_sec: 3600,
        token_type: 'Bearer',
        api_domain: 'https://www.zohoapis.com',
        scope: 'ZohoInventory.items.READ,ZohoInventory.settings.READ',
      }),
    } as Response;
  }) as typeof fetch;

  const {
    service,
    connectionFindFirstCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-zoho-ok',
    platform: 'zoho',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  const result = await service.handleCallback({
    workspaceId: 'ws-zoho-ok',
    platform: 'zoho',
    payload: {
      code: 'zoho-code-1',
      state,
      connectionId: 'conn-1',
    },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.url, 'https://accounts.zoho.com/oauth/v2/token');
  assert.equal(fetchCalls[0]?.init?.method, 'POST');
  const body = String(fetchCalls[0]?.init?.body ?? '');
  assert.match(body, /grant_type=authorization_code/);
  assert.match(body, /code=zoho-code-1/);

  assert.equal(connectionFindFirstCalls.length, 1);
  const findFirstCall = connectionFindFirstCalls[0] as ConnectionFindFirstCall;
  assert.deepEqual(findFirstCall.where, {
    id: 'conn-1',
    workspaceId: 'ws-zoho-ok',
    platform: 'ZOHO',
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-zoho-ok');
  assert.equal(secretUpsertCall.create.platform, 'ZOHO');
  assert.equal(secretUpsertCall.create.authType, 'oauth2');
  assert.ok(Buffer.isBuffer(secretUpsertCall.create.secretCiphertext));
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'zoho-access-token');
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'zoho-refresh-token');

  const metadata = secretUpsertCall.create.secretMetadata;
  assert.deepEqual(metadata.scopes, ['ZohoInventory.items.READ', 'ZohoInventory.settings.READ']);
  assert.equal(metadata.tokenType, 'Bearer');
  assert.equal(metadata.expiresInSeconds, 3600);
  assert.equal(metadata.apiDomain, 'https://www.zohoapis.com');

  assert.equal(connectionUpdateCalls.length, 1);
  assert.deepEqual((connectionUpdateCalls[0] as ConnectionUpdateCall).data, {
    status: 'ACTIVE',
    lastError: null,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      connectionId: 'conn-1',
      platform: 'zoho',
      stored: true,
      status: 'connected',
    },
  });

  global.fetch = originalFetch;
});

test('handleCallback for Xero success exchanges code, stores encrypted secret, and sets ACTIVE status', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.XERO_CLIENT_ID = 'xero-client-id';
  process.env.XERO_REDIRECT_URI = 'https://api.example.com/connections/xero/callback';
  process.env.XERO_SCOPES = 'openid profile accounting.transactions';
  process.env.XERO_CLIENT_SECRET = 'xero-client-secret';

  const originalFetch = global.fetch;
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'xero-access-token',
        refresh_token: 'xero-refresh-token',
        expires_in: 1800,
        scope: 'openid profile accounting.transactions',
        token_type: 'Bearer',
      }),
    } as Response;
  }) as typeof fetch;

  const {
    service,
    connectionFindFirstCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-xero-ok',
    platform: 'xero',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  const result = await service.handleCallback({
    workspaceId: 'ws-xero-ok',
    platform: 'xero',
    payload: {
      code: 'xero-code-1',
      state,
      connectionId: 'conn-1',
    },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.url, 'https://identity.xero.com/connect/token');
  assert.equal(fetchCalls[0]?.init?.method, 'POST');
  const body = String(fetchCalls[0]?.init?.body ?? '');
  assert.match(body, /grant_type=authorization_code/);
  assert.match(body, /code=xero-code-1/);

  assert.equal(connectionFindFirstCalls.length, 1);
  const findFirstCall = connectionFindFirstCalls[0] as ConnectionFindFirstCall;
  assert.deepEqual(findFirstCall.where, {
    id: 'conn-1',
    workspaceId: 'ws-xero-ok',
    platform: 'XERO',
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-xero-ok');
  assert.equal(secretUpsertCall.create.platform, 'XERO');
  assert.equal(secretUpsertCall.create.authType, 'oauth2');
  assert.ok(Buffer.isBuffer(secretUpsertCall.create.secretCiphertext));
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'xero-access-token');
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'xero-refresh-token');

  assert.equal(connectionUpdateCalls.length, 1);
  assert.deepEqual((connectionUpdateCalls[0] as ConnectionUpdateCall).data, {
    status: 'ACTIVE',
    lastError: null,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      connectionId: 'conn-1',
      platform: 'xero',
      stored: true,
      status: 'connected',
    },
  });

  global.fetch = originalFetch;
});

test('handleCallback for Xero token exchange failure marks connection as ERROR', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.XERO_CLIENT_ID = 'xero-client-id';
  process.env.XERO_REDIRECT_URI = 'https://api.example.com/connections/xero/callback';
  process.env.XERO_SCOPES = 'openid profile accounting.transactions';
  process.env.XERO_CLIENT_SECRET = 'xero-client-secret';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Code expired',
      }),
    }) as Response) as typeof fetch;

  const {
    service,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-xero-fail',
    platform: 'xero',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-xero-fail',
        platform: 'xero',
        payload: {
          code: 'bad-code',
          state,
          connectionId: 'conn-1',
        },
      }),
    /Xero token exchange failed with status 401/,
  );

  assert.equal(connectionSecretUpsertCalls.length, 0);
  assert.equal(connectionUpdateCalls.length, 1);
  const update = connectionUpdateCalls[0] as ConnectionUpdateCall;
  assert.equal(update.where.id, 'conn-1');
  assert.equal(update.data.status, 'ERROR');
  assert.match(update.data.lastError ?? '', /Xero token exchange failed with status 401/);

  global.fetch = originalFetch;
});

test('handleCallback for QuickBooks success exchanges code, stores encrypted secret with realmId metadata, and sets ACTIVE status', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.QUICKBOOKS_CLIENT_ID = 'quickbooks-client-id';
  process.env.QUICKBOOKS_CLIENT_SECRET = 'quickbooks-client-secret';
  process.env.QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';
  process.env.QUICKBOOKS_REDIRECT_URI = 'https://api.example.com/connections/quickbooks/callback';
  process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

  const originalFetch = global.fetch;
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (url, init) => {
    fetchCalls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'qb-access-token',
        refresh_token: 'qb-refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8640000,
        token_type: 'Bearer',
        scope: 'com.intuit.quickbooks.accounting',
      }),
    } as Response;
  }) as typeof fetch;

  const {
    service,
    connectionFindFirstCalls,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-qb-ok',
    platform: 'quickbooks',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  const result = await service.handleCallback({
    workspaceId: 'ws-qb-ok',
    platform: 'quickbooks',
    payload: {
      code: 'qb-code-1',
      state,
      connectionId: 'conn-1',
      realmId: '1234567890',
    },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.url, 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer');
  assert.equal(fetchCalls[0]?.init?.method, 'POST');
  const body = String(fetchCalls[0]?.init?.body ?? '');
  assert.match(body, /grant_type=authorization_code/);
  assert.match(body, /code=qb-code-1/);

  assert.equal(connectionFindFirstCalls.length, 1);
  const findFirstCall = connectionFindFirstCalls[0] as ConnectionFindFirstCall;
  assert.deepEqual(findFirstCall.where, {
    id: 'conn-1',
    workspaceId: 'ws-qb-ok',
    platform: 'QUICKBOOKS',
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-qb-ok');
  assert.equal(secretUpsertCall.create.platform, 'QUICKBOOKS');
  assert.equal(secretUpsertCall.create.authType, 'oauth2');
  assert.ok(Buffer.isBuffer(secretUpsertCall.create.secretCiphertext));
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'qb-access-token');
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'qb-refresh-token');

  const metadata = secretUpsertCall.create.secretMetadata;
  assert.equal(metadata.realmId, '1234567890');
  assert.deepEqual(metadata.scopes, ['com.intuit.quickbooks.accounting']);
  assert.equal(metadata.tokenType, 'Bearer');
  assert.equal(metadata.expiresIn, 3600);
  assert.equal(metadata.refreshTokenExpiresIn, 8640000);

  assert.equal(connectionUpdateCalls.length, 1);
  assert.deepEqual((connectionUpdateCalls[0] as ConnectionUpdateCall).data, {
    status: 'ACTIVE',
    lastError: null,
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      connectionId: 'conn-1',
      platform: 'quickbooks',
      stored: true,
      status: 'connected',
    },
  });

  global.fetch = originalFetch;
});

test('handleCallback for QuickBooks token exchange failure marks connection as ERROR and stores no plaintext secret', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';
  process.env.QUICKBOOKS_CLIENT_ID = 'quickbooks-client-id';
  process.env.QUICKBOOKS_CLIENT_SECRET = 'quickbooks-client-secret';
  process.env.QUICKBOOKS_SCOPES = 'com.intuit.quickbooks.accounting';
  process.env.QUICKBOOKS_REDIRECT_URI = 'https://api.example.com/connections/quickbooks/callback';
  process.env.QUICKBOOKS_ENVIRONMENT = 'sandbox';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Code expired',
      }),
    }) as Response) as typeof fetch;

  const {
    service,
    connectionSecretUpsertCalls,
    connectionUpdateCalls,
  } = createService();

  const started = await service.startConnectionFlow({
    workspaceId: 'ws-qb-fail',
    platform: 'quickbooks',
  });
  assert.equal(started.data.type, 'auth_url');
  if (started.data.type !== 'auth_url') {
    assert.fail('Expected auth_url response');
  }
  const state = new URL(started.data.url).searchParams.get('state');
  assert.ok(state);

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-qb-fail',
        platform: 'quickbooks',
        payload: {
          code: 'bad-code',
          state,
          connectionId: 'conn-1',
          realmId: '1234567890',
        },
      }),
    /QuickBooks token exchange failed with status 401/,
  );

  assert.equal(connectionSecretUpsertCalls.length, 0);
  assert.equal(connectionUpdateCalls.length, 1);
  const update = connectionUpdateCalls[0] as ConnectionUpdateCall;
  assert.equal(update.where.id, 'conn-1');
  assert.equal(update.data.status, 'ERROR');
  assert.match(update.data.lastError ?? '', /QuickBooks token exchange failed with status 401/);
  assert.doesNotMatch(update.data.lastError ?? '', /bad-code|access_token|refresh_token/i);

  global.fetch = originalFetch;
});

test('handleCallback WooCommerce success stores encrypted secret metadata and activates connection', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        environment: { home_url: 'https://demo-store.example' },
        database: { wc_database_version: '10.2.3' },
        active_plugins: ['woocommerce/woocommerce.php'],
        version: '10.2.3',
      }),
    }) as Response) as typeof fetch;

  const { service, connectionSecretUpsertCalls, connectionUpdateCalls } = createService();

  const result = await service.handleCallback({
    workspaceId: 'ws-woo',
    platform: 'woocommerce',
    payload: {
      storeUrl: 'demo-store.example/',
      consumerKey: 'ck_test_123',
      consumerSecret: 'cs_test_123',
    },
  });

  assert.equal(connectionSecretUpsertCalls.length, 1);
  const secretUpsertCall = connectionSecretUpsertCalls[0] as ConnectionSecretUpsertCall;
  assert.equal(secretUpsertCall.where.connectionId, 'conn-1');
  assert.equal(secretUpsertCall.create.workspaceId, 'ws-woo');
  assert.equal(secretUpsertCall.create.platform, 'WOOCOMMERCE');
  assert.equal(secretUpsertCall.create.authType, 'api_keys_callback');
  assert.ok(Buffer.isBuffer(secretUpsertCall.create.secretCiphertext));
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'ck_test_123');
  assert.notEqual(secretUpsertCall.create.secretCiphertext.toString('utf8'), 'cs_test_123');

  const metadata = secretUpsertCall.create.secretMetadata;
  assert.equal(metadata.alg, 'aes-256-gcm');
  assert.equal(metadata.v, 1);
  assert.equal(metadata.storeUrl, 'https://demo-store.example');
  assert.equal(
    metadata.validatedEndpoint,
    'https://demo-store.example/wp-json/wc/v3/system_status',
  );
  assert.equal(metadata.apiVersion, '10.2.3');
  assert.ok(typeof metadata.validatedAt === 'string');
  assert.ok(typeof metadata.receivedAt === 'string');
  assert.equal('consumerKey' in metadata, false);
  assert.equal('consumerSecret' in metadata, false);

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
      platform: 'woocommerce',
      stored: true,
      status: 'connected',
    },
  });

  global.fetch = originalFetch;
});

test('handleCallback WooCommerce invalid credentials marks connection as error', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    }) as Response) as typeof fetch;

  const { service, connectionSecretUpsertCalls, connectionUpdateCalls } = createService();

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-woo',
        platform: 'woocommerce',
        payload: {
          storeUrl: 'demo-store.example',
          consumerKey: 'ck_bad',
          consumerSecret: 'cs_bad',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(
        badRequestError.message,
        'Invalid WooCommerce credentials or store URL (status 401)',
      );
      return true;
    },
  );

  global.fetch = (async () =>
    ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    }) as Response) as typeof fetch;

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-woo',
        platform: 'woocommerce',
        payload: {
          storeUrl: 'demo-store.example',
          consumerKey: 'ck_forbidden',
          consumerSecret: 'cs_forbidden',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(
        badRequestError.message,
        'Invalid WooCommerce credentials or store URL (status 403)',
      );
      return true;
    },
  );

  assert.equal(connectionSecretUpsertCalls.length, 0);
  assert.equal(connectionUpdateCalls.length, 2);
  const lastUpdate = connectionUpdateCalls[1] as ConnectionUpdateCall;
  assert.equal(lastUpdate.where.id, 'conn-1');
  assert.equal(lastUpdate.data.status, 'ERROR');
  assert.equal(lastUpdate.data.lastError, 'Invalid WooCommerce credentials or store URL (status 403)');

  global.fetch = originalFetch;
});

test('handleCallback WooCommerce invalid URL or malformed validation response marks connection as error', async () => {
  process.env.CONNECTION_SECRET_KEY = '12345678901234567890123456789012';

  const originalFetch = global.fetch;
  const { service, connectionSecretUpsertCalls, connectionUpdateCalls } = createService();

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-woo',
        platform: 'woocommerce',
        payload: {
          storeUrl: 'https://',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(badRequestError.message, 'Invalid WooCommerce credentials or store URL');
      return true;
    },
  );

  global.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        unexpected: 'shape',
      }),
    }) as Response) as typeof fetch;

  await assert.rejects(
    () =>
      service.handleCallback({
        workspaceId: 'ws-woo',
        platform: 'woocommerce',
        payload: {
          storeUrl: 'demo-store.example',
          consumerKey: 'ck_test',
          consumerSecret: 'cs_test',
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const badRequestError = error as BadRequestException;
      assert.equal(badRequestError.message, 'Invalid WooCommerce credentials or store URL');
      return true;
    },
  );

  assert.equal(connectionSecretUpsertCalls.length, 0);
  assert.equal(connectionUpdateCalls.length, 2);
  assert.equal((connectionUpdateCalls[0] as ConnectionUpdateCall).data.status, 'ERROR');
  assert.equal((connectionUpdateCalls[1] as ConnectionUpdateCall).data.status, 'ERROR');

  global.fetch = originalFetch;
});
