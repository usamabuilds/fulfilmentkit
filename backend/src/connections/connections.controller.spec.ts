import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError } from 'zod';
import { ConnectionsController } from './connections.controller';

function createController() {
  const handleCallbackCalls: Array<Record<string, unknown>> = [];
  const service = {
    handleCallback: async (args: Record<string, unknown>) => {
      handleCallbackCalls.push(args);
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
