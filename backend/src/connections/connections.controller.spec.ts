import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError } from 'zod';
import { ConnectionsController } from './connections.controller';

function createController() {
  const handleCallbackCalls: Array<Record<string, unknown>> = [];
  let handleCallbackError: Error | null = null;
  const service = {
    handleCallback: async (args: Record<string, unknown>) => {
      handleCallbackCalls.push(args);
      if (handleCallbackError) {
        throw handleCallbackError;
      }
      return {
        success: true,
        data: {
          connectionId: 'conn-1',
          platform: 'woocommerce',
          stored: true,
          status: 'connected',
        },
      };
    },
  };

  return {
    controller: new ConnectionsController(service as never),
    handleCallbackCalls,
    setHandleCallbackError: (error: Error | null) => {
      handleCallbackError = error;
    },
  };
}

test('callback parses WooCommerce callback body schema before invoking service', async () => {
  const { controller, handleCallbackCalls } = createController();

  const result = await controller.callback(
    { workspaceId: 'ws-1' },
    'woocommerce',
    {
      storeUrl: 'demo-store.example',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    },
  );

  assert.equal(handleCallbackCalls.length, 1);
  assert.deepEqual(handleCallbackCalls[0], {
    workspaceId: 'ws-1',
    platform: 'woocommerce',
    payload: {
      storeUrl: 'demo-store.example',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    },
  });
  assert.equal(result.success, true);
});

test('callback rejects malformed WooCommerce callback payload with schema error', async () => {
  const { controller, handleCallbackCalls } = createController();

  await assert.rejects(
    () =>
      controller.callback(
        { workspaceId: 'ws-1' },
        'woocommerce',
        {
          storeUrl: 'demo-store.example',
          consumerKey: 'ck_test',
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      return true;
    },
  );

  assert.equal(handleCallbackCalls.length, 0);
});

test('xeroCallback redirects frontend to success URL when callback succeeds', async () => {
  process.env.FRONTEND_BASE_URL = 'https://app.example.com';
  const { controller, handleCallbackCalls } = createController();
  let redirectedTo = '';

  const state = Buffer.from(
    JSON.stringify({ workspaceId: 'ws-xero', connectionId: 'conn-1' }),
    'utf8',
  ).toString('base64url');

  await controller.xeroCallback(
    {
      code: 'xero-code',
      state,
    },
    {
      redirect: (url: string) => {
        redirectedTo = url;
      },
    } as never,
  );

  assert.equal(handleCallbackCalls.length, 1);
  assert.deepEqual(handleCallbackCalls[0], {
    workspaceId: 'ws-xero',
    platform: 'xero',
    payload: {
      code: 'xero-code',
      state,
      connectionId: 'conn-1',
    },
  });

  const redirectUrl = new URL(redirectedTo);
  assert.equal(redirectUrl.toString(), 'https://app.example.com/connections?xero=success');
});

test('xeroCallback redirects frontend with concise error when callback fails', async () => {
  process.env.FRONTEND_BASE_URL = 'https://app.example.com';
  const { controller, setHandleCallbackError, handleCallbackCalls } = createController();
  let redirectedTo = '';

  setHandleCallbackError(new Error('Xero callback verification failed badly'));

  const state = Buffer.from(
    JSON.stringify({ workspaceId: 'ws-xero', connectionId: 'conn-1' }),
    'utf8',
  ).toString('base64url');

  await controller.xeroCallback(
    {
      code: 'xero-code',
      state,
    },
    {
      redirect: (url: string) => {
        redirectedTo = url;
      },
    } as never,
  );

  assert.equal(handleCallbackCalls.length, 1);
  const redirectUrl = new URL(redirectedTo);
  assert.equal(
    redirectUrl.toString(),
    'https://app.example.com/connections?xero_error=xero_callback_verification_failed_badly',
  );
});
