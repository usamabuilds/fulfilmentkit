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
    { key: 'US', value: '125', share: '71.428571428571428571428571428571429' },
    { key: 'unknown', value: '50', share: '28.571428571428571428571428571428571' },
  ]);
});
