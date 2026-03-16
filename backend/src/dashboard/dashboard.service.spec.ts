import assert from 'node:assert/strict';
import test from 'node:test';
import { DashboardService } from './dashboard.service';

function createServiceWithOrders(rows: Array<{ shipCountryCode: string | null; total: string }>) {
  const findManyCalls: any[] = [];

  const prisma = {
    order: {
      findMany: async (args: any) => {
        findManyCalls.push(args);
        return rows;
      },
    },
  };

  return {
    service: new DashboardService(prisma as any),
    findManyCalls,
  };
}

test('breakdown(by=country) returns empty list when no orders are in range', async () => {
  const { service } = createServiceWithOrders([]);

  const result = await service.breakdown({
    workspaceId: 'ws-1',
    by: 'country',
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: new Date('2026-01-31T00:00:00.000Z'),
  });

  assert.deepEqual(result, { items: [] });
});

test('breakdown(by=country) groups unknown country and computes shares', async () => {
  const { service, findManyCalls } = createServiceWithOrders([
    { shipCountryCode: 'US', total: '100' },
    { shipCountryCode: null, total: '50' },
    { shipCountryCode: 'US', total: '25' },
  ]);

  const result = await service.breakdown({
    workspaceId: 'ws-1',
    by: 'country',
    from: new Date('2026-02-01T00:00:00.000Z'),
    to: new Date('2026-02-28T00:00:00.000Z'),
  });

  assert.equal(findManyCalls.length, 1);
  assert.equal(findManyCalls[0].where.workspaceId, 'ws-1');
  assert.ok(findManyCalls[0].where.orderedAt.gte instanceof Date);
  assert.ok(findManyCalls[0].where.orderedAt.lte instanceof Date);

  assert.deepEqual(result.items, [
    { key: 'US', value: '125', share: '71.428571428571428571' },
    { key: 'unknown', value: '50', share: '28.571428571428571429' },
  ]);
});

function createServiceForAlerts(args: {
  inventory?: Array<{ onHand: number }>;
  dailyMetricRowsByWindow?: Array<
    Array<{ day?: Date; revenue: string; grossMarginAmount?: string; refundsAmount?: string }>
  >;
  orderTotal?: string;
  feeTotal?: string;
  refundTotal?: string;
}) {
  const dailyMetricRowsByWindow = [...(args.dailyMetricRowsByWindow ?? [])];

  const prisma = {
    inventory: {
      findMany: async () => args.inventory ?? [],
    },
    dailyMetric: {
      findMany: async () => dailyMetricRowsByWindow.shift() ?? [],
    },
    order: {
      aggregate: async () => ({
        _sum: {
          total: args.orderTotal ?? '0',
        },
      }),
    },
    fee: {
      aggregate: async () => ({
        _sum: {
          amount: args.feeTotal ?? '0',
        },
      }),
    },
    refund: {
      aggregate: async () => ({
        _sum: {
          amount: args.refundTotal ?? '0',
        },
      }),
    },
  };

  return new DashboardService(prisma as any);
}

test('alerts does not include margin leakage when margin is healthy', async () => {
  const service = createServiceForAlerts({
    inventory: [{ onHand: 10 }],
    dailyMetricRowsByWindow: [[{ revenue: '1000', grossMarginAmount: '300' }]],
  });

  const result = await service.alerts({
    workspaceId: 'ws-1',
    from: new Date('2026-03-01T00:00:00.000Z'),
    to: new Date('2026-03-07T00:00:00.000Z'),
  });

  assert.equal(result.alerts.some((a) => a.type === 'margin_leakage'), false);
});

test('alerts includes margin leakage with warning payload evidence', async () => {
  const service = createServiceForAlerts({
    inventory: [{ onHand: 10 }],
    dailyMetricRowsByWindow: [
      [{ revenue: '1000', grossMarginAmount: '150' }],
      [{ revenue: '1000', grossMarginAmount: '300' }],
    ],
  });

  const result = await service.alerts({
    workspaceId: 'ws-1',
    from: new Date('2026-03-08T00:00:00.000Z'),
    to: new Date('2026-03-14T00:00:00.000Z'),
  });

  const marginLeakage = result.alerts.find((a) => a.type === 'margin_leakage');
  assert.ok(marginLeakage);
  assert.equal(marginLeakage.level, 'critical');
  assert.equal(marginLeakage.title, 'Margin leakage detected');
  assert.match(marginLeakage.message, /current gross margin 15%/);
  assert.match(marginLeakage.message, /threshold 20%/);
  assert.match(marginLeakage.message, /previous window 30%/);
  assert.match(marginLeakage.message, /drop 15pp/);
  assert.match(marginLeakage.message, /source dailyMetric/);
});


test('alerts does not include refund spikes when current ratio is near baseline', async () => {
  const service = createServiceForAlerts({
    inventory: [{ onHand: 10 }],
    dailyMetricRowsByWindow: [
      [{ revenue: '1000', grossMarginAmount: '300' }],
      [{ revenue: '1000', grossMarginAmount: '300' }],
      [{ day: new Date('2026-03-08T00:00:00.000Z'), revenue: '1000', refundsAmount: '10' }],
      [{ day: new Date('2026-03-01T00:00:00.000Z'), revenue: '1000', refundsAmount: '9' }],
    ],
  });

  const result = await service.alerts({
    workspaceId: 'ws-1',
    from: new Date('2026-03-08T00:00:00.000Z'),
    to: new Date('2026-03-14T00:00:00.000Z'),
  });

  assert.equal(result.alerts.some((a) => a.type === 'refund_spikes'), false);
});

test('alerts includes refund spikes with critical payload when refund ratio jumps', async () => {
  const service = createServiceForAlerts({
    inventory: [{ onHand: 10 }],
    dailyMetricRowsByWindow: [
      [{ revenue: '1000', grossMarginAmount: '300' }],
      [{ revenue: '1000', grossMarginAmount: '300' }],
      [
        { day: new Date('2026-03-08T00:00:00.000Z'), revenue: '1000', refundsAmount: '120' },
        { day: new Date('2026-03-09T00:00:00.000Z'), revenue: '1000', refundsAmount: '60' },
      ],
      [{ day: new Date('2026-03-01T00:00:00.000Z'), revenue: '1000', refundsAmount: '20' }],
    ],
  });

  const result = await service.alerts({
    workspaceId: 'ws-1',
    from: new Date('2026-03-08T00:00:00.000Z'),
    to: new Date('2026-03-14T00:00:00.000Z'),
  });

  const refundSpike = result.alerts.find((a) => a.type === 'refund_spikes');
  assert.ok(refundSpike);
  assert.equal(refundSpike.level, 'critical');
  assert.equal(refundSpike.title, 'Refund spike detected');
  assert.match(refundSpike.message, /current refund ratio 9%/);
  assert.match(refundSpike.message, /baseline 2%/);
  assert.match(refundSpike.message, /delta 7pp/);
  assert.match(refundSpike.message, /multiple 4\.5x/);
  assert.match(refundSpike.message, /thresholds warning 1\.5x or \+1pp/);
  assert.equal(refundSpike.count, 2);
});
