import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OrdersReportsService,
  reportFilterDefinitionsByKey,
  type ReportKey,
} from './orders-reports.service';

type QueryRawFn = {
  <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
};

type ServiceDeps = {
  ordersTransactionalReportsService?: {
    runOrdersReversalsByProduct?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runOrdersOverTime?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runItemsBoughtTogether?: (workspaceId: string, filters: unknown) => Promise<unknown>;
  };
  fulfillmentReportsService?: {
    runShippingDeliveryPerformance?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runOrdersFulfilledOverTime?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runShippingLabelsOverTime?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runShippingLabelsByOrder?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runOrderFulfillmentHealth?: (filters: unknown) => Promise<unknown>;
  };
  inventoryReportsService?: {
    runInventoryAging?: (workspaceId: string, filters: unknown) => Promise<unknown>;
  };
  financeReportsService?: {
    runSalesSummary?: (filters: unknown) => Promise<unknown>;
  };
  customerReportsService?: {
    runNewVsReturningCustomers?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runCustomerCohortAnalysis?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runRfmCustomerAnalysis?: (workspaceId: string, filters: unknown) => Promise<unknown>;
    runRfmCustomerList?: (workspaceId: string, filters: unknown) => Promise<unknown>;
  };
  connections?: Array<{ capabilities: unknown }>;
};

function createService(deps: ServiceDeps = {}) {
  const prisma = {
    connection: {
      findMany: async () => deps.connections ?? [],
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

  return new OrdersReportsService(
    prisma as never,
    deps.ordersTransactionalReportsService as never,
    deps.fulfillmentReportsService as never,
    deps.inventoryReportsService as never,
    deps.financeReportsService as never,
    deps.customerReportsService as never,
  );
}

const allReportKeys = Object.keys(reportFilterDefinitionsByKey) as ReportKey[];

test('runReport always returns deterministic output shape across all report keys', async () => {
  const service = createService();

  for (const key of allReportKeys) {
    const run = await service.runReport({
      workspaceId: 'ws-1',
      key,
      filters: {},
    });

    assert.equal(run.reportKey, key);
    assert.equal(run.status, 'completed');
    assert.equal(typeof run.output.rows, 'number');
    assert.equal(typeof run.output.summary, 'string');
    assert.ok(Array.isArray(run.output.chartRows));
    assert.ok(['supported', 'partial', 'unsupported'].includes(run.output.supportStatus));
    assert.ok(typeof run.output.dataCoverage.coverageStart === 'string' && run.output.dataCoverage.coverageStart.length > 0);
    assert.ok(typeof run.output.dataCoverage.coverageEnd === 'string' && run.output.dataCoverage.coverageEnd.length > 0);
    assert.equal(typeof run.output.dataCoverage.isCompleteForRange, 'boolean');
    assert.ok(typeof run.output.generatedAt === 'string' && !Number.isNaN(Date.parse(run.output.generatedAt)));
  }
});

test('runReport returns deterministic support metadata with zero rows for unsupported reports', async () => {
  const service = createService();
  const unsupportedKeys: ReportKey[] = ['sales-summary', 'order-fulfillment-health', 'predicted-spend-tier'];

  for (const key of unsupportedKeys) {
    const run = await service.runReport({
      workspaceId: 'ws-1',
      key,
      filters: {},
    });

    assert.equal(run.status, 'completed');
    assert.equal(run.output.rows, 0);
    assert.deepEqual(run.output.chartRows, []);
    assert.equal(run.output.supportStatus, 'unsupported');
    assert.ok(typeof run.output.supportReason === 'string' && run.output.supportReason.length > 0);
    assert.match(run.output.supportReason ?? '', /(not implemented|unsupported|not available)/i);
  }
});

test('runReport returns partial support metadata with caveat and reason for unsupported variant grouping mode', async () => {
  const service = createService({
    ordersTransactionalReportsService: {
      runItemsBoughtTogether: async () => ({
        rows: 0,
        chartRows: [],
        summary: 'Variant grouping mode is unsupported/disabled for this workspace.',
        caveat: 'Variant identifiers are unavailable in the current source schema.',
        supportStatusOverride: 'partial',
        supportReasonOverride: 'Variant grouping is unavailable for this source dataset.',
      }),
    },
  });

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
  assert.ok(typeof run.output.supportReason === 'string' && run.output.supportReason.length > 0);
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
  const service = createService({
    ordersTransactionalReportsService: {
      runOrdersOverTime: async () => ({
        rows: 1,
        chartRows: [
          {
            periodStart: '2026-03-10',
            periodLabel: '2026-03-10',
            ordersCount: 2,
            averageUnitsPerOrder: 1.5,
            averageOrderValue: 45,
            returnedUnits: 0,
            returnedAmount: 0,
          },
        ],
        summary: 'Found 2 orders across 1 period.',
      }),
    },
  });

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
  const service = createService({
    connections: [
      {
        capabilities: {
          supports_pos: false,
          supports_subscriptions: false,
          supports_tax_detail: true,
        },
      },
    ],
  });

  const reports = await service.listReports('ws-1');
  const shippingLabelsByOrder = reports.find((report) => report.key === 'shipping-labels-by-order');
  const itemsBoughtTogether = reports.find((report) => report.key === 'items-bought-together');

  assert.ok(shippingLabelsByOrder);
  assert.equal(shippingLabelsByOrder.supportStatus, 'partial');
  assert.match(
    shippingLabelsByOrder.supportReason ?? '',
    /Missing workspace connection capabilities: supports_pos\./,
  );
  assert.ok(shippingLabelsByOrder.requiredFeatures?.includes('capability:supports_pos'));

  assert.ok(itemsBoughtTogether);
  assert.equal(itemsBoughtTogether.supportStatus, 'unsupported');
  assert.match(
    itemsBoughtTogether.supportReason ?? '',
    /Missing workspace connection capabilities: supports_subscriptions\./,
  );
  assert.ok(itemsBoughtTogether.requiredFeatures?.includes('capability:supports_subscriptions'));
});
