import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type DateRangePreset,
  type OrderStatusOption,
  type RegionOption,
  type ReportComputationOutput,
  type ReportFiltersByKey,
  type ReportPlatform,
  type TimeGroupingOption,
} from '../../orders/reporting/orders-reports.service';

@Injectable()
export class OrdersTransactionalReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runOrdersReversalsByProduct(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-reversals-by-product'],
  ): Promise<ReportComputationOutput> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        total: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
        refunds: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return { rows: 0, summary: 'No reversed products found for the selected filters.' };
    }

    type ProductAggregate = {
      productId: string;
      sku: string;
      name: string;
      orderedQuantity: number;
      reversedQuantity: number;
      orderCount: number;
      refundedOrderCount: number;
    };

    const aggregates = new Map<string, ProductAggregate>();
    let approximatedRefundAllocationUsed = false;

    for (const order of orders) {
      const orderRefundAmount = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      const hasRefund = orderRefundAmount > 0;

      const reversedByProduct = hasRefund
        ? this.allocateReversedQuantitiesByProduct({
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            refundAmount: orderRefundAmount,
            orderTotalAmount: Number(order.total),
          })
        : new Map<string, number>();

      if (hasRefund) {
        approximatedRefundAllocationUsed = true;
      }

      const orderProductIds = new Set<string>();
      const refundedOrderProductIds = new Set<string>();

      for (const item of order.items) {
        const existing =
          aggregates.get(item.productId) ??
          ({
            productId: item.productId,
            sku: item.product.sku,
            name: item.product.name,
            orderedQuantity: 0,
            reversedQuantity: 0,
            orderCount: 0,
            refundedOrderCount: 0,
          } satisfies ProductAggregate);

        existing.orderedQuantity += item.quantity;
        existing.reversedQuantity += reversedByProduct.get(item.productId) ?? 0;
        aggregates.set(item.productId, existing);

        orderProductIds.add(item.productId);
        if (hasRefund) {
          refundedOrderProductIds.add(item.productId);
        }
      }

      for (const productId of orderProductIds) {
        const aggregate = aggregates.get(productId);
        if (aggregate) {
          aggregate.orderCount += 1;
        }
      }
      for (const productId of refundedOrderProductIds) {
        const aggregate = aggregates.get(productId);
        if (aggregate) {
          aggregate.refundedOrderCount += 1;
        }
      }
    }

    const chartRows = Array.from(aggregates.values())
      .map((aggregate) => {
        const reversedQuantityRate =
          aggregate.orderedQuantity > 0
            ? Number(((aggregate.reversedQuantity / aggregate.orderedQuantity) * 100).toFixed(2))
            : 0;
        const returnRate =
          aggregate.orderCount > 0
            ? Number(((aggregate.refundedOrderCount / aggregate.orderCount) * 100).toFixed(2))
            : 0;

        return {
          productId: aggregate.productId,
          sku: aggregate.sku,
          productName: aggregate.name,
          orderedQuantity: aggregate.orderedQuantity,
          reversedQuantity: aggregate.reversedQuantity,
          reversedQuantityRate,
          returnRate,
        };
      })
      .filter((row) => row.reversedQuantity > 0 || row.orderedQuantity > 0)
      .sort((a, b) => b.reversedQuantity - a.reversedQuantity || a.sku.localeCompare(b.sku));

    const reversedUnits = chartRows.reduce((sum, row) => sum + row.reversedQuantity, 0);
    const orderedUnits = chartRows.reduce((sum, row) => sum + row.orderedQuantity, 0);
    const caveat = approximatedRefundAllocationUsed
      ? 'Partial mapping: refund records do not include line-level product references, so reversed quantity is deterministically allocated by each line item share of refunded order value.'
      : undefined;

    return {
      rows: chartRows.length,
      chartRows,
      caveat,
      summary: `${chartRows.length} products, ${orderedUnits} ordered units, and ${reversedUnits} reversed units in ${filters.dateRange}.${caveat ? ` Caveat: ${caveat}` : ''}`,
    };
  }

  async runOrdersOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-over-time'],
  ): Promise<ReportComputationOutput> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        orderedAt: true,
        createdAt: true,
        total: true,
        items: {
          select: {
            quantity: true,
          },
        },
        refunds: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        summary: `No orders found in ${filters.dateRange} (${filters.groupBy} grouping).`,
      };
    }

    const buckets = new Map<
      string,
      {
        periodStart: Date;
        ordersCount: number;
        unitsTotal: number;
        grossOrderValueTotal: number;
        returnedUnits: number;
        returnedAmount: number;
      }
    >();

    for (const order of orders) {
      const sourceDate = order.orderedAt ?? order.createdAt;
      const periodStart = this.normalizeToPeriodStart(sourceDate, filters.groupBy);
      const key = periodStart.toISOString();
      const existing =
        buckets.get(key) ??
        ({
          periodStart,
          ordersCount: 0,
          unitsTotal: 0,
          grossOrderValueTotal: 0,
          returnedUnits: 0,
          returnedAmount: 0,
        } satisfies {
          periodStart: Date;
          ordersCount: number;
          unitsTotal: number;
          grossOrderValueTotal: number;
          returnedUnits: number;
          returnedAmount: number;
        });
      existing.ordersCount += 1;
      existing.unitsTotal += order.items.reduce((sum, item) => sum + item.quantity, 0);
      existing.grossOrderValueTotal += Number(order.total);
      const orderReturnedAmount = order.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      existing.returnedAmount += orderReturnedAmount;
      if (orderReturnedAmount > 0) {
        existing.returnedUnits += order.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      buckets.set(key, existing);
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: this.formatPeriodLabel(bucket.periodStart, filters.groupBy),
        ordersCount: bucket.ordersCount,
        averageUnitsPerOrder:
          bucket.ordersCount > 0 ? Number((bucket.unitsTotal / bucket.ordersCount).toFixed(2)) : 0,
        averageOrderValue:
          bucket.ordersCount > 0
            ? Number((bucket.grossOrderValueTotal / bucket.ordersCount).toFixed(2))
            : 0,
        returnedUnits: bucket.returnedUnits,
        returnedAmount: Number(bucket.returnedAmount.toFixed(2)),
      }));

    const refundedAmountTotal = chartRows.reduce(
      (sum, row) => sum + (typeof row.returnedAmount === 'number' ? row.returnedAmount : 0),
      0,
    );
    const returnedUnitsTotal = chartRows.reduce(
      (sum, row) => sum + (typeof row.returnedUnits === 'number' ? row.returnedUnits : 0),
      0,
    );

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${orders.length} orders across ${chartRows.length} ${filters.groupBy} buckets in ${filters.dateRange}. Returned units: ${returnedUnitsTotal}. Refunded amount: ${refundedAmountTotal.toFixed(2)}.`,
    };
  }

  async runItemsBoughtTogether(
    workspaceId: string,
    filters: ReportFiltersByKey['items-bought-together'],
  ): Promise<ReportComputationOutput> {
    if (filters.itemGroupingLevel === 'variant') {
      return {
        rows: 0,
        summary:
          'Variant mode is currently unsupported/disabled because OrderItem variant identifiers are unavailable in the current schema.',
        caveat:
          'Using product-level identifiers only. Variant-level combinations cannot be calculated with the current OrderItem fields.',
        chartRows: [],
      };
    }

    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        items: {
          select: { productId: true },
          distinct: ['productId'],
        },
      },
    });

    const combinationSize = Number(filters.combinationSize);
    const topN = Math.max(1, Math.min(100, Math.floor(filters.topN)));
    const combinationCounts = new Map<string, number>();
    let qualifyingOrders = 0;

    for (const order of orders) {
      const productIds = order.items.map((item) => item.productId).sort();
      if (productIds.length < combinationSize) {
        continue;
      }

      qualifyingOrders += 1;
      for (const combination of this.buildCombinations(productIds, combinationSize)) {
        const combinationKey = combination.join(':');
        combinationCounts.set(combinationKey, (combinationCounts.get(combinationKey) ?? 0) + 1);
      }
    }

    const sortedRows = Array.from(combinationCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topN)
      .map(([combination, ordersContaining]) => {
        const percentageOverQualifyingOrders =
          qualifyingOrders > 0 ? Number(((ordersContaining / qualifyingOrders) * 100).toFixed(2)) : 0;
        return {
          combination,
          ordersContaining,
          percentageOverQualifyingOrders,
        };
      });

    return {
      rows: sortedRows.length,
      chartRows: sortedRows,
      summary: `${sortedRows.length} top product ${combinationSize === 2 ? 'pairs' : 'triples'} returned from ${combinationCounts.size} combinations across ${qualifyingOrders} qualifying orders in ${filters.dateRange}.`,
    };
  }

  private buildCombinations(items: string[], combinationSize: number): string[][] {
    const combinations: string[][] = [];
    const current: string[] = [];

    const visit = (startIndex: number) => {
      if (current.length === combinationSize) {
        combinations.push([...current]);
        return;
      }

      for (let index = startIndex; index < items.length; index += 1) {
        current.push(items[index]);
        visit(index + 1);
        current.pop();
      }
    };

    visit(0);
    return combinations;
  }

  private buildOrderWhereInput(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
      statuses?: OrderStatusOption[];
    },
  ) {
    const dateRange = this.getDateRangeStart(filters.dateRange);
    const where: {
      workspaceId: string;
      OR: Array<{ orderedAt: { gte: Date } } | { orderedAt: null; createdAt: { gte: Date } }>;
      channel?: { in: string[] };
      shipCountryCode?: { in: string[] };
      status?: { in: string[] };
    } = {
      workspaceId,
      OR: [{ orderedAt: { gte: dateRange } }, { orderedAt: null, createdAt: { gte: dateRange } }],
    };

    const normalizedPlatforms = filters.platform.filter((platform) => platform !== 'all');
    if (normalizedPlatforms.length > 0) {
      where.channel = { in: normalizedPlatforms };
    }

    const regionCountryCodes: Record<Exclude<RegionOption, 'all'>, string[]> = {
      na: ['US', 'CA', 'MX'],
      eu: ['GB', 'DE', 'FR', 'ES', 'IT', 'NL'],
      apac: ['AU', 'NZ', 'JP', 'SG'],
    };
    if (filters.region !== 'all') {
      where.shipCountryCode = { in: regionCountryCodes[filters.region] };
    }

    if (filters.statuses && !filters.statuses.includes('all')) {
      where.status = { in: filters.statuses };
    }

    return where;
  }

  private allocateReversedQuantitiesByProduct(input: {
    items: Array<{ productId: string; quantity: number }>;
    refundAmount: number;
    orderTotalAmount: number;
  }): Map<string, number> {
    const quantitiesByProduct = new Map<string, number>();
    for (const item of input.items) {
      quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const orderUnits = Array.from(quantitiesByProduct.values()).reduce((sum, quantity) => sum + quantity, 0);
    if (orderUnits <= 0 || input.refundAmount <= 0) {
      return new Map<string, number>();
    }

    const cappedRatio =
      input.orderTotalAmount > 0
        ? Math.max(0, Math.min(1, input.refundAmount / input.orderTotalAmount))
        : 1;
    const targetReversedUnits = Math.min(orderUnits, orderUnits * cappedRatio);

    const allocations = Array.from(quantitiesByProduct.entries()).map(([productId, quantity]) => {
      const exact = quantity * cappedRatio;
      const floor = Math.floor(exact);
      return { productId, quantity, floor, remainder: exact - floor };
    });

    let allocated = allocations.reduce((sum, item) => sum + item.floor, 0);
    const targetRounded = Math.round(targetReversedUnits);
    const remainingUnits = Math.max(0, targetRounded - allocated);

    const sortedByRemainder = [...allocations].sort(
      (a, b) => b.remainder - a.remainder || a.productId.localeCompare(b.productId),
    );
    for (let i = 0; i < remainingUnits; i += 1) {
      const allocation = sortedByRemainder[i % sortedByRemainder.length];
      if (allocation.floor < allocation.quantity) {
        allocation.floor += 1;
        allocated += 1;
      }
      if (allocated >= targetRounded) {
        break;
      }
    }

    return new Map(allocations.map((item) => [item.productId, Math.min(item.floor, item.quantity)]));
  }

  private getDateRangeStart(dateRange: DateRangePreset): Date {
    const now = new Date();
    const daysBackByRange: Record<DateRangePreset, number> = {
      last_7_days: 7,
      last_14_days: 14,
      last_30_days: 30,
      last_90_days: 90,
    };
    const daysBack = daysBackByRange[dateRange];

    return new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  }

  private normalizeToPeriodStart(value: Date, groupBy: TimeGroupingOption): Date {
    const year = value.getUTCFullYear();
    const month = value.getUTCMonth();
    const day = value.getUTCDate();
    const hour = value.getUTCHours();

    if (groupBy === 'hour') {
      return new Date(Date.UTC(year, month, day, hour));
    }
    if (groupBy === 'day') {
      return new Date(Date.UTC(year, month, day));
    }
    if (groupBy === 'month') {
      return new Date(Date.UTC(year, month, 1));
    }

    const dayOfWeek = value.getUTCDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    return new Date(Date.UTC(year, month, day - daysFromMonday));
  }

  private formatPeriodLabel(value: Date, groupBy: TimeGroupingOption): string {
    const iso = value.toISOString();
    if (groupBy === 'hour') {
      return iso.slice(0, 13) + ':00';
    }
    if (groupBy === 'day') {
      return iso.slice(0, 10);
    }
    if (groupBy === 'month') {
      return iso.slice(0, 7);
    }
    return `week_of_${iso.slice(0, 10)}`;
  }
}
