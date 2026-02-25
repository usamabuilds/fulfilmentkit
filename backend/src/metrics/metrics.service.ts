import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

type ComputeDailyMetricParams = {
  workspaceId: string;
  dayUtc: Date; // must be UTC midnight for the day key
};

type ComputeSkuDailyMetricParams = {
  workspaceId: string;
  dayUtc: Date; // must be UTC midnight for the day key
};

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

function endExclusiveOfUtcDay(dayUtcMidnight: Date): Date {
  return new Date(dayUtcMidnight.getTime() + 24 * 60 * 60 * 1000);
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeDailyMetric(params: ComputeDailyMetricParams) {
    const { workspaceId } = params;

    const day = startOfUtcDay(params.dayUtc);
    const nextDay = endExclusiveOfUtcDay(day);

    // Orders window for the day (orderedAt)
    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        orderedAt: {
          gte: day,
          lt: nextDay,
        },
      },
      select: {
        id: true,
        total: true,
      },
    });

    const orderIds = orders.map((o) => o.id);

    const revenue = orders.reduce(
      (acc, o) => acc.plus(o.total),
      new Prisma.Decimal('0'),
    );

    const ordersCount = orders.length;

    const unitsAgg = await this.prisma.orderItem.aggregate({
      where: {
        orderId: { in: orderIds.length ? orderIds : ['__none__'] },
      },
      _sum: { quantity: true },
    });

    const units = unitsAgg._sum.quantity ?? 0;

    const refundsAgg = await this.prisma.refund.aggregate({
      where: {
        workspaceId,
        createdAt: {
          gte: day,
          lt: nextDay,
        },
      },
      _sum: { amount: true },
    });

    const feesAgg = await this.prisma.fee.aggregate({
      where: {
        workspaceId,
        createdAt: {
          gte: day,
          lt: nextDay,
        },
      },
      _sum: { amount: true },
    });

    const refundsAmount = refundsAgg._sum.amount ?? new Prisma.Decimal('0');
    const feesAmount = feesAgg._sum.amount ?? new Prisma.Decimal('0');

    // COGS not modeled yet, stable 0 (locked behavior)
    const cogsAmount = new Prisma.Decimal('0');

    const grossMarginAmount = revenue
      .minus(refundsAmount)
      .minus(feesAmount)
      .minus(cogsAmount);

    const grossMarginPercent = revenue.equals(0)
      ? new Prisma.Decimal('0')
      : grossMarginAmount.div(revenue).times(100);

    // Inventory alerts counts (current state)
    const stockoutsCount = await this.prisma.inventory.count({
      where: {
        workspaceId,
        onHand: { lte: 0 },
      },
    });

    // Threshold locked at 5 (same as dashboard alerts)
    const lowStockCount = await this.prisma.inventory.count({
      where: {
        workspaceId,
        onHand: { lte: 5 },
      },
    });

    // Upsert DailyMetric for that UTC day
    const record = await this.prisma.dailyMetric.upsert({
      where: {
        workspaceId_day: {
          workspaceId,
          day,
        },
      },
      update: {
        revenue,
        orders: ordersCount,
        units,
        refundsAmount,
        feesAmount,
        cogsAmount,
        grossMarginAmount,
        grossMarginPercent,
        stockoutsCount,
        lowStockCount,
      },
      create: {
        workspaceId,
        day,
        revenue,
        orders: ordersCount,
        units,
        refundsAmount,
        feesAmount,
        cogsAmount,
        grossMarginAmount,
        grossMarginPercent,
        stockoutsCount,
        lowStockCount,
      },
    });

    this.logger.log(
      `DailyMetric upserted: workspaceId=${workspaceId} day=${day.toISOString()}`,
    );

    return record;
  }

  async computeSkuDailyMetric(params: ComputeSkuDailyMetricParams) {
    const { workspaceId } = params;

    const day = startOfUtcDay(params.dayUtc);
    const nextDay = endExclusiveOfUtcDay(day);

    // Pull orders for the day
    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        orderedAt: {
          gte: day,
          lt: nextDay,
        },
      },
      select: {
        id: true,
      },
    });

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) {
      this.logger.log(
        `No orders for sku metrics: workspaceId=${workspaceId} day=${day.toISOString()}`,
      );
      return { upserted: 0 };
    }

    // Pull order items with productId for those orders
    const items = await this.prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
      },
      select: {
        productId: true,
        quantity: true,
        total: true,
      },
    });

    // Aggregate per productId
    const perProduct = new Map<
      string,
      { unitsSold: number; revenue: Prisma.Decimal }
    >();

    for (const it of items) {
      const existing = perProduct.get(it.productId) ?? {
        unitsSold: 0,
        revenue: new Prisma.Decimal('0'),
      };

      existing.unitsSold += it.quantity;
      existing.revenue = existing.revenue.plus(it.total);

      perProduct.set(it.productId, existing);
    }

    const totalRevenue = Array.from(perProduct.values()).reduce(
      (acc, v) => acc.plus(v.revenue),
      new Prisma.Decimal('0'),
    );

    // Day totals for refunds and fees (we do not have per-item attribution yet)
    const refundsAgg = await this.prisma.refund.aggregate({
      where: {
        workspaceId,
        createdAt: {
          gte: day,
          lt: nextDay,
        },
      },
      _sum: { amount: true },
    });

    const feesAgg = await this.prisma.fee.aggregate({
      where: {
        workspaceId,
        createdAt: {
          gte: day,
          lt: nextDay,
        },
      },
      _sum: { amount: true },
    });

    const refundsTotal = refundsAgg._sum.amount ?? new Prisma.Decimal('0');
    const feesTotal = feesAgg._sum.amount ?? new Prisma.Decimal('0');

    // StockEnd: current onHand across all locations for the product (stable v1)
    const productIds = Array.from(perProduct.keys());

    const inventoryRows = await this.prisma.inventory.findMany({
      where: {
        workspaceId,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        onHand: true,
      },
    });

    const stockEndByProduct = new Map<string, number>();
    for (const row of inventoryRows) {
      stockEndByProduct.set(
        row.productId,
        (stockEndByProduct.get(row.productId) ?? 0) + row.onHand,
      );
    }

    let upserted = 0;

    for (const [productId, agg] of perProduct.entries()) {
      const unitsSold = agg.unitsSold;
      const revenue = agg.revenue;

      const avgPrice =
        unitsSold > 0 ? revenue.div(new Prisma.Decimal(unitsSold)) : new Prisma.Decimal('0');

      // Allocate refunds/fees by revenue share (deterministic and stable)
      const share = totalRevenue.equals(0)
        ? new Prisma.Decimal('0')
        : revenue.div(totalRevenue);

      const refundsAmount = refundsTotal.times(share);
      const feesAmount = feesTotal.times(share);

      const stockEnd = stockEndByProduct.get(productId) ?? 0;

      await this.prisma.skuDailyMetric.upsert({
        where: {
          workspaceId_productId_day: {
            workspaceId,
            productId,
            day,
          },
        },
        update: {
          unitsSold,
          revenue,
          refundsAmount,
          feesAmount,
          avgPrice,
          stockEnd,
        },
        create: {
          workspaceId,
          productId,
          day,
          unitsSold,
          revenue,
          refundsAmount,
          feesAmount,
          avgPrice,
          stockEnd,
        },
      });

      upserted += 1;
    }

    this.logger.log(
      `SkuDailyMetric upserted: workspaceId=${workspaceId} day=${day.toISOString()} skus=${upserted}`,
    );

    return { upserted };
  }
}
