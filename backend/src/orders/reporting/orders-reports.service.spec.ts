import assert from 'node:assert/strict';
import test from 'node:test';
import { OrdersReportsService, type ReportKey } from './orders-reports.service';

type QueryRawFn = {
  <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
};

function createService() {
  const prisma = {
    connection: {
      findMany: async () => [],
    },
    order: {
      findMany: async (args: { select?: Record<string, unknown> }) => {
        const select = args.select ?? {};

        if ('total' in select && 'refunds' in select && 'id' in select) {
          return [
            {
              id: 'order-reversal-1',
              total: '100',
              items: [
                {
                  productId: 'prod-1',
                  quantity: 2,
                  product: { sku: 'SKU-1', name: 'Widget' },
                },
              ],
              refunds: [{ amount: '20' }],
            },
          ];
        }

        if ('orderedAt' in select && 'total' in select && 'refunds' in select) {
          return [
            {
              orderedAt: new Date('2026-03-10T00:00:00.000Z'),
              createdAt: new Date('2026-03-09T00:00:00.000Z'),
              total: '50',
              items: [{ quantity: 1 }],
              refunds: [{ amount: '0' }],
            },
          ];
        }

        if ('orderNumber' in select && 'orderedAt' in select && 'createdAt' in select) {
          return [
            {
              id: 'ship-order-1',
              orderNumber: 'SO-1',
              orderedAt: new Date('2026-03-12T00:00:00.000Z'),
              createdAt: new Date('2026-03-12T00:00:00.000Z'),
            },
          ];
        }

        if ('items' in select) {
          return [
            {
              items: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
            },
          ];
        }

        return [];
      },
    },
    orderItem: {
      findMany: async () => [
        {
          orderId: 'ship-order-1',
          location: { code: 'NA-WH-1' },
        },
      ],
    },
    $queryRaw: (async <T>(strings: TemplateStringsArray): Promise<T> => {
      const sql = strings.join(' ');

      if (sql.includes('OrderFulfillmentStatusEvent')) {
        return [
          { orderId: 'ship-order-1', status: 'FULFILLED', eventAt: new Date('2026-03-13T00:00:00.000Z') },
          { orderId: 'ship-order-1', status: 'SHIPPED', eventAt: new Date('2026-03-14T00:00:00.000Z') },
          { orderId: 'ship-order-1', status: 'DELIVERED', eventAt: new Date('2026-03-16T00:00:00.000Z') },
        ] as T;
      }

      if (sql.includes('OrderShippingLabelPurchase')) {
        return [
          {
            orderId: 'ship-order-1',
            carrier: 'ups',
            service: 'ground',
            purchasedAt: new Date('2026-03-13T12:00:00.000Z'),
          },
        ] as T;
      }

      return [] as T;
    }) as QueryRawFn,
  };

  return new OrdersReportsService(prisma as never);
}

test('runReport executes each implemented report query method', async () => {
  const service = createService();
  const workspaceId = 'ws-1';

  const implementedKeys: ReportKey[] = [
    'orders-reversals-by-product',
    'orders-over-time',
    'shipping-delivery-performance',
    'orders-fulfilled-over-time',
    'shipping-labels-over-time',
    'shipping-labels-by-order',
    'items-bought-together',
  ];

  for (const key of implementedKeys) {
    const run = await service.runReport({
      workspaceId,
      key,
      filters: key === 'items-bought-together' ? { itemGroupingLevel: 'product', combinationSize: '2', topN: 10 } : {},
    });

    assert.equal(run.reportKey, key);
    assert.equal(run.status, 'completed');
    assert.ok(run.output.summary.length > 0);
  }
});

test('runReport returns deterministic support metadata with zero rows for unsupported reports', async () => {
  const service = createService();

  const run = await service.runReport({
    workspaceId: 'ws-1',
    key: 'sales-summary',
    filters: {},
  });

  assert.equal(run.status, 'completed');
  assert.equal(run.output.rows, 0);
  assert.deepEqual(run.output.chartRows, []);
  assert.equal(
    run.output.summary,
    'Sales Summary is not currently implemented for last_30_days.',
  );
  assert.equal(run.output.supportStatus, 'unsupported');
  assert.equal(
    run.output.supportReason,
    'Execution is not implemented yet; this key currently returns a placeholder summary with no computed rows.',
  );
});

test('runReport returns caveat for partial reports when unsupported mode is requested', async () => {
  const service = createService();

  const run = await service.runReport({
    workspaceId: 'ws-1',
    key: 'items-bought-together',
    filters: {
      itemGroupingLevel: 'variant',
    },
  });

  assert.equal(run.status, 'completed');
  assert.equal(run.output.rows, 0);
  assert.equal(run.output.supportStatus, 'partial');
  assert.ok(typeof run.output.caveat === 'string' && run.output.caveat.length > 0);
  assert.match(run.output.summary, /unsupported\/disabled/i);
});

test('exportReport returns metadata-only output when rows are empty', async () => {
  const service = createService();

  const exported = await service.exportReport({
    workspaceId: 'ws-1',
    key: 'items-bought-together',
    filters: {
      itemGroupingLevel: 'variant',
      combinationSize: '2',
      topN: 10,
    },
  });

  assert.equal(exported.isEmpty, true);
  assert.match(exported.message, /metadata only/i);
  assert.ok(exported.file.length > 0);
});

test('exportReport returns workbook with rows when report output is non-empty', async () => {
  const service = createService();

  const exported = await service.exportReport({
    workspaceId: 'ws-1',
    key: 'orders-over-time',
    filters: {
      groupBy: 'day',
    },
  });

  assert.equal(exported.isEmpty, false);
  assert.match(exported.message, /successfully/i);
  assert.ok(exported.file.length > 0);
});

test('listReports appends capability metadata when required workspace capability is missing', async () => {
  const service = createService();

  const reports = await service.listReports('ws-1');
  const shippingLabelsByOrder = reports.find((report) => report.key === 'shipping-labels-by-order');

  assert.ok(shippingLabelsByOrder);
  assert.equal(shippingLabelsByOrder.supportStatus, 'partial');
  assert.match(
    shippingLabelsByOrder.supportReason ?? '',
    /Missing workspace connection capabilities: supports_pos\./,
  );
  assert.ok(shippingLabelsByOrder.requiredFeatures?.includes('capability:supports_pos'));
});
