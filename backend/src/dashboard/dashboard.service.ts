import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '../generated/prisma';

type DashboardSummaryArgs = {
  workspaceId: string;
  from?: Date;
  to?: Date;
};

type TrendsMetric = 'revenue' | 'orders' | 'margin' | 'refunds' | 'fees';
type TrendsGroupBy = 'day' | 'week';

type DashboardTrendsArgs = {
  workspaceId: string;
  metric: TrendsMetric;
  groupBy: TrendsGroupBy;
  from?: Date;
  to?: Date;
};

type BreakdownBy = 'channel' | 'country' | 'sku';

type DashboardBreakdownArgs = {
  workspaceId: string;
  by: BreakdownBy;
  from?: Date;
  to?: Date;
};

type DashboardAlertsArgs = {
  workspaceId: string;
  from?: Date;
  to?: Date;
};

type TopSkusSortBy = 'revenue' | 'units' | 'refunds' | 'margin';

type DashboardTopSkusArgs = {
  workspaceId: string;
  from?: Date;
  to?: Date;
  limit: number;
  sortBy: TopSkusSortBy;
};

type RepeatPurchaseGroupBy = 'day' | 'week';

type DashboardRepeatPurchaseArgs = {
  workspaceId: string;
  from?: Date;
  to?: Date;
  groupBy?: RepeatPurchaseGroupBy;
};

type AlertType = 'stockouts' | 'low_stock' | 'margin_leakage' | 'refund_spikes';
type AlertLevel = 'critical' | 'warning' | 'info';

type DashboardAlert = {
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  count?: number;
};

type DashboardTopSkuRow = {
  sku: string;
  name: string;
  revenue: string;
  units: number;
  refunds: string;
  fees: string;
  margin: string;
  share: string;
};

function decimalToString(v: any) {
  if (v === null || v === undefined) return '0';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'bigint') return v.toString();
  if (typeof v?.toString === 'function') return v.toString();
  return String(v);
}

function toEndOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function startOfWeekUtc(d: Date) {
  const day = d.getUTCDay(); // 0=Sun ... 6=Sat
  const diff = (day + 6) % 7; // Mon=0 ... Sun=6
  const s = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  s.setUTCDate(s.getUTCDate() - diff);
  return s;
}

function addDaysUtc(d: Date, days: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function addWeeksUtc(d: Date, weeks: number) {
  return addDaysUtc(d, weeks * 7);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function normalizeCustomerIdentity(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async repeatPurchase(args: DashboardRepeatPurchaseArgs) {
    const { workspaceId } = args;
    const groupBy: RepeatPurchaseGroupBy = args.groupBy ?? 'day';
    const rangeFrom = args.from ? startOfDayUtc(args.from) : startOfDayUtc(new Date());
    const rangeTo = args.to ? toEndOfDayUtc(args.to) : toEndOfDayUtc(new Date());
    const bucketStart = groupBy === 'week' ? startOfWeekUtc(rangeFrom) : startOfDayUtc(rangeFrom);

    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        orderedAt: {
          gte: rangeFrom,
          lte: rangeTo,
        },
      },
      select: {
        id: true,
        externalRef: true,
        orderNumber: true,
        orderedAt: true,
      },
      orderBy: {
        orderedAt: 'asc',
      },
    });

    const points: Array<{
      date: string;
      repeatPurchaseRatePercent: string;
      repeatCustomers: number;
      newCustomers: number;
      totalCustomers: number;
    }> = [];

    if (groupBy === 'day') {
      for (let d = bucketStart; d <= rangeTo; d = addDaysUtc(d, 1)) {
        points.push({
          date: isoDate(d),
          repeatPurchaseRatePercent: '0',
          repeatCustomers: 0,
          newCustomers: 0,
          totalCustomers: 0,
        });
      }
    } else {
      for (let d = bucketStart; d <= rangeTo; d = addWeeksUtc(d, 1)) {
        points.push({
          date: isoDate(d),
          repeatPurchaseRatePercent: '0',
          repeatCustomers: 0,
          newCustomers: 0,
          totalCustomers: 0,
        });
      }
    }

    const firstSeenOrderByCustomer = new Map<string, Date>();
    for (const order of orders) {
      if (!order.orderedAt) continue;
      const identity =
        normalizeCustomerIdentity(order.orderNumber) ||
        normalizeCustomerIdentity(order.externalRef) ||
        `order:${order.id}`;

      const knownFirstSeen = firstSeenOrderByCustomer.get(identity);
      if (!knownFirstSeen || order.orderedAt < knownFirstSeen) {
        firstSeenOrderByCustomer.set(identity, order.orderedAt);
      }
    }

    const totalCustomers = firstSeenOrderByCustomer.size;
    let repeatCustomers = 0;
    let newCustomers = 0;
    for (const identity of firstSeenOrderByCustomer.keys()) {
      const orderCount = orders.filter((order) => {
        const orderIdentity =
          normalizeCustomerIdentity(order.orderNumber) ||
          normalizeCustomerIdentity(order.externalRef) ||
          `order:${order.id}`;
        return orderIdentity === identity;
      }).length;
      if (orderCount > 1) repeatCustomers += 1;
      else newCustomers += 1;
    }

    const pointByDate = new Map<string, { repeatIdentities: Set<string>; newIdentities: Set<string> }>();
    for (const point of points) {
      pointByDate.set(point.date, { repeatIdentities: new Set<string>(), newIdentities: new Set<string>() });
    }

    for (const order of orders) {
      if (!order.orderedAt) continue;
      const identity =
        normalizeCustomerIdentity(order.orderNumber) ||
        normalizeCustomerIdentity(order.externalRef) ||
        `order:${order.id}`;
      const firstSeen = firstSeenOrderByCustomer.get(identity);
      if (!firstSeen) continue;

      const pointDate =
        groupBy === 'week' ? isoDate(startOfWeekUtc(order.orderedAt)) : isoDate(startOfDayUtc(order.orderedAt));
      const bucket = pointByDate.get(pointDate);
      if (!bucket) continue;

      if (order.orderedAt.getTime() === firstSeen.getTime()) {
        bucket.newIdentities.add(identity);
      } else {
        bucket.repeatIdentities.add(identity);
      }
    }

    for (const point of points) {
      const bucket = pointByDate.get(point.date);
      if (!bucket) continue;
      const totalBucketCustomers = bucket.newIdentities.size + bucket.repeatIdentities.size;
      const ratePercent =
        totalBucketCustomers > 0 ? (bucket.repeatIdentities.size / totalBucketCustomers) * 100 : 0;
      point.newCustomers = bucket.newIdentities.size;
      point.repeatCustomers = bucket.repeatIdentities.size;
      point.totalCustomers = totalBucketCustomers;
      point.repeatPurchaseRatePercent = String(ratePercent);
    }

    const repeatPurchaseRatePercent = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    return {
      repeatPurchaseRatePercent: String(repeatPurchaseRatePercent),
      repeatCustomers,
      newCustomers,
      totalCustomers,
      points,
    };
  }

  async topSkus(args: DashboardTopSkusArgs) {
    const { workspaceId, sortBy, limit } = args;
    const rangeFrom = args.from ? startOfDayUtc(args.from) : startOfDayUtc(new Date());
    const rangeTo = args.to ? toEndOfDayUtc(args.to) : toEndOfDayUtc(new Date());

    // Try metrics tables first (SkuDailyMetric)
    const skuMetricRows = await this.prisma.skuDailyMetric.findMany({
      where: {
        workspaceId,
        day: {
          gte: startOfDayUtc(rangeFrom),
          lte: startOfDayUtc(rangeTo),
        },
      },
      select: {
        unitsSold: true,
        revenue: true,
        refundsAmount: true,
        feesAmount: true,
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    if (skuMetricRows.length > 0) {
      const totals = new Map<
        string,
        {
          sku: string;
          name: string;
          revenue: Prisma.Decimal;
          units: number;
          refunds: Prisma.Decimal;
          fees: Prisma.Decimal;
          margin: Prisma.Decimal;
        }
      >();
      let grandRevenue = new Prisma.Decimal('0');

      for (const row of skuMetricRows) {
        const sku = row.product?.sku ?? 'unknown';
        const name = row.product?.name ?? sku;
        const revenue = new Prisma.Decimal(decimalToString(row.revenue));
        const refunds = new Prisma.Decimal(decimalToString(row.refundsAmount));
        const fees = new Prisma.Decimal(decimalToString(row.feesAmount));
        const margin = revenue.minus(refunds).minus(fees);
        const current = totals.get(sku) ?? {
          sku,
          name,
          revenue: new Prisma.Decimal('0'),
          units: 0,
          refunds: new Prisma.Decimal('0'),
          fees: new Prisma.Decimal('0'),
          margin: new Prisma.Decimal('0'),
        };

        current.revenue = current.revenue.plus(revenue);
        current.units += row.unitsSold ?? 0;
        current.refunds = current.refunds.plus(refunds);
        current.fees = current.fees.plus(fees);
        current.margin = current.margin.plus(margin);
        totals.set(sku, current);
        grandRevenue = grandRevenue.plus(revenue);
      }

      const rows = Array.from(totals.values())
        .map<DashboardTopSkuRow>((item) => {
          const share = grandRevenue.gt(0)
            ? item.revenue.div(grandRevenue).mul(100)
            : new Prisma.Decimal('0');

          return {
            sku: item.sku,
            name: item.name,
            revenue: decimalToString(item.revenue),
            units: item.units,
            refunds: decimalToString(item.refunds),
            fees: decimalToString(item.fees),
            margin: decimalToString(item.margin),
            share: decimalToString(share),
          };
        })
        .sort((a, b) => {
          if (sortBy === 'units') return b.units - a.units;
          return Number(b[sortBy]) - Number(a[sortBy]);
        })
        .slice(0, limit);

      return { rows };
    }

    // Fallback to raw tables
    const itemRows = await this.prisma.orderItem.findMany({
      where: {
        order: {
          workspaceId,
          orderedAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
      },
      select: {
        orderId: true,
        quantity: true,
        total: true,
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    if (itemRows.length === 0) {
      return { rows: [] as DashboardTopSkuRow[] };
    }

    const orderRevenueTotals = new Map<string, Prisma.Decimal>();
    const orderSkuRevenue = new Map<string, Map<string, Prisma.Decimal>>();
    const skuTotals = new Map<
      string,
      {
        sku: string;
        name: string;
        revenue: Prisma.Decimal;
        units: number;
        refunds: Prisma.Decimal;
        fees: Prisma.Decimal;
      }
    >();

    for (const row of itemRows) {
      const sku = row.product?.sku ?? 'unknown';
      const name = row.product?.name ?? sku;
      const revenue = new Prisma.Decimal(decimalToString(row.total));
      const units = row.quantity ?? 0;
      const skuCurrent = skuTotals.get(sku) ?? {
        sku,
        name,
        revenue: new Prisma.Decimal('0'),
        units: 0,
        refunds: new Prisma.Decimal('0'),
        fees: new Prisma.Decimal('0'),
      };

      skuCurrent.revenue = skuCurrent.revenue.plus(revenue);
      skuCurrent.units += units;
      skuTotals.set(sku, skuCurrent);

      const orderCurrent = orderRevenueTotals.get(row.orderId) ?? new Prisma.Decimal('0');
      orderRevenueTotals.set(row.orderId, orderCurrent.plus(revenue));

      const skuMap = orderSkuRevenue.get(row.orderId) ?? new Map<string, Prisma.Decimal>();
      skuMap.set(sku, (skuMap.get(sku) ?? new Prisma.Decimal('0')).plus(revenue));
      orderSkuRevenue.set(row.orderId, skuMap);
    }

    const orderIds = Array.from(orderRevenueTotals.keys());

    const [refundRows, feeRows] = await Promise.all([
      this.prisma.refund.findMany({
        where: {
          workspaceId,
          orderId: { in: orderIds },
          createdAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          orderId: true,
          amount: true,
        },
      }),
      this.prisma.fee.findMany({
        where: {
          workspaceId,
          orderId: { in: orderIds },
          createdAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          orderId: true,
          amount: true,
        },
      }),
    ]);

    const allocateOrderAmount = (orderId: string | null, amount: Prisma.Decimal, kind: 'refunds' | 'fees') => {
      if (!orderId) return;
      const orderTotal = orderRevenueTotals.get(orderId);
      const skuMap = orderSkuRevenue.get(orderId);
      if (!orderTotal || !skuMap || orderTotal.lte(0)) return;

      for (const [sku, skuRevenue] of skuMap.entries()) {
        const skuCurrent = skuTotals.get(sku);
        if (!skuCurrent) continue;
        const allocated = skuRevenue.div(orderTotal).mul(amount);
        if (kind === 'refunds') {
          skuCurrent.refunds = skuCurrent.refunds.plus(allocated);
        } else {
          skuCurrent.fees = skuCurrent.fees.plus(allocated);
        }
      }
    };

    for (const row of refundRows) {
      allocateOrderAmount(
        row.orderId,
        new Prisma.Decimal(decimalToString(row.amount)),
        'refunds',
      );
    }

    for (const row of feeRows) {
      allocateOrderAmount(row.orderId, new Prisma.Decimal(decimalToString(row.amount)), 'fees');
    }

    let grandRevenue = new Prisma.Decimal('0');
    for (const row of skuTotals.values()) {
      grandRevenue = grandRevenue.plus(row.revenue);
    }

    const rows = Array.from(skuTotals.values())
      .map<DashboardTopSkuRow>((item) => {
        const margin = item.revenue.minus(item.refunds).minus(item.fees);
        const share = grandRevenue.gt(0)
          ? item.revenue.div(grandRevenue).mul(100)
          : new Prisma.Decimal('0');

        return {
          sku: item.sku,
          name: item.name,
          revenue: decimalToString(item.revenue),
          units: item.units,
          refunds: decimalToString(item.refunds),
          fees: decimalToString(item.fees),
          margin: decimalToString(margin),
          share: decimalToString(share),
        };
      })
      .sort((a, b) => {
        if (sortBy === 'units') return b.units - a.units;
        return Number(b[sortBy]) - Number(a[sortBy]);
      })
      .slice(0, limit);

    return { rows };
  }

  async summary(args: DashboardSummaryArgs) {
    const { workspaceId, from, to } = args;

    const rangeFrom = from ? startOfDayUtc(from) : undefined;
    const rangeTo = to ? startOfDayUtc(toEndOfDayUtc(to)) : undefined;

    // Try metrics tables first (DailyMetric)
    if (rangeFrom || rangeTo) {
      const dayWhere: any = { workspaceId };
      if (rangeFrom || rangeTo) {
        dayWhere.day = {};
        if (rangeFrom) dayWhere.day.gte = rangeFrom;
        if (rangeTo) dayWhere.day.lte = rangeTo;
      }

      const metricsRows = await this.prisma.dailyMetric.findMany({
        where: dayWhere,
        select: {
          revenue: true,
          orders: true,
          units: true,
          refundsAmount: true,
          feesAmount: true,
          cogsAmount: true,
          grossMarginAmount: true,
          grossMarginPercent: true,
        },
      });

      if (metricsRows.length > 0) {
        const revenue = metricsRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.revenue))),
          new Prisma.Decimal('0'),
        );

        const orders = metricsRows.reduce((acc, r) => acc + (r.orders ?? 0), 0);
        const units = metricsRows.reduce((acc, r) => acc + (r.units ?? 0), 0);

        const refundsAmount = metricsRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.refundsAmount))),
          new Prisma.Decimal('0'),
        );

        const feesAmount = metricsRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.feesAmount))),
          new Prisma.Decimal('0'),
        );

        const cogsAmount = metricsRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.cogsAmount))),
          new Prisma.Decimal('0'),
        );

        const grossMarginAmount = metricsRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.grossMarginAmount))),
          new Prisma.Decimal('0'),
        );

        const grossMarginPercent = revenue.gt(0)
          ? grossMarginAmount.div(revenue).mul(100)
          : new Prisma.Decimal('0');

        const refundRatePercent = revenue.gt(0)
          ? refundsAmount.div(revenue).mul(100)
          : new Prisma.Decimal('0');

        // Alerts counts remain derived from raw inventory (stable)
        const inventoryRows = await this.prisma.inventory.findMany({
          where: { workspaceId },
          select: { onHand: true },
        });

        let stockoutsCount = 0;
        let lowStockCount = 0;

        for (const row of inventoryRows) {
          if (row.onHand <= 0) stockoutsCount++;
          else if (row.onHand <= 5) lowStockCount++;
        }

        return {
          revenue: decimalToString(revenue),
          orders,
          units,

          refundsAmount: decimalToString(refundsAmount),
          refundRatePercent: decimalToString(refundRatePercent),
          feesAmount: decimalToString(feesAmount),

          cogsAmount: decimalToString(cogsAmount),
          grossMarginAmount: decimalToString(grossMarginAmount),
          grossMarginPercent: decimalToString(grossMarginPercent),

          stockoutsCount,
          lowStockCount,
        };
      }
    }

    // Fallback to raw tables (existing behavior)
    const orderWhere: any = { workspaceId };
    if (from || to) {
      orderWhere.orderedAt = {};
      if (from) orderWhere.orderedAt.gte = from;
      if (to) orderWhere.orderedAt.lte = toEndOfDayUtc(to);
    }

    const refundsWhere: any = { workspaceId };
    const feesWhere: any = { workspaceId };

    if (from || to) {
      refundsWhere.createdAt = {};
      feesWhere.createdAt = {};
      if (from) {
        refundsWhere.createdAt.gte = startOfDayUtc(from);
        feesWhere.createdAt.gte = startOfDayUtc(from);
      }
      if (to) {
        refundsWhere.createdAt.lte = toEndOfDayUtc(to);
        feesWhere.createdAt.lte = toEndOfDayUtc(to);
      }
    }

    const [ordersCount, ordersAgg, refundsAgg, feesAgg, inventoryRows] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.aggregate({
        where: orderWhere,
        _sum: {
          total: true,
        },
      }),
      this.prisma.refund.aggregate({
        where: refundsWhere,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.fee.aggregate({
        where: feesWhere,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.inventory.findMany({
        where: { workspaceId },
        select: {
          onHand: true,
        },
      }),
    ]);

    const revenue = new Prisma.Decimal(decimalToString(ordersAgg._sum.total ?? '0'));

    const unitsAgg = await this.prisma.orderItem.aggregate({
      where: {
        order: {
          workspaceId,
          ...(orderWhere.orderedAt ? { orderedAt: orderWhere.orderedAt } : {}),
        },
      },
      _sum: {
        quantity: true,
      },
    });

    const units = unitsAgg._sum.quantity ?? 0;

    const refundsAmount = new Prisma.Decimal(decimalToString(refundsAgg._sum.amount ?? '0'));
    const feesAmount = new Prisma.Decimal(decimalToString(feesAgg._sum.amount ?? '0'));

    const cogsAmount = new Prisma.Decimal('0');

    const grossMarginAmount = revenue.minus(cogsAmount).minus(feesAmount);
    const grossMarginPercent = revenue.gt(0)
      ? grossMarginAmount.div(revenue).mul(100)
      : new Prisma.Decimal('0');

    const refundRatePercent = revenue.gt(0)
      ? refundsAmount.div(revenue).mul(100)
      : new Prisma.Decimal('0');

    let stockoutsCount = 0;
    let lowStockCount = 0;

    for (const row of inventoryRows) {
      if (row.onHand <= 0) stockoutsCount++;
      else if (row.onHand <= 5) lowStockCount++;
    }

    return {
      revenue: decimalToString(revenue),
      orders: ordersCount,
      units,

      refundsAmount: decimalToString(refundsAmount),
      refundRatePercent: decimalToString(refundRatePercent),
      feesAmount: decimalToString(feesAmount),

      cogsAmount: decimalToString(cogsAmount),
      grossMarginAmount: decimalToString(grossMarginAmount),
      grossMarginPercent: decimalToString(grossMarginPercent),

      stockoutsCount,
      lowStockCount,
    };
  }

  async trends(args: DashboardTrendsArgs) {
    const { workspaceId, metric, groupBy } = args;

    const rangeFrom = args.from ? startOfDayUtc(args.from) : startOfDayUtc(new Date());
    const rangeTo = args.to ? toEndOfDayUtc(args.to) : toEndOfDayUtc(new Date());

    const bucketStart = groupBy === 'week' ? startOfWeekUtc(rangeFrom) : startOfDayUtc(rangeFrom);

    const points: Array<{ date: string; value: string | number }> = [];

    if (groupBy === 'day') {
      for (let d = bucketStart; d <= rangeTo; d = addDaysUtc(d, 1)) {
        points.push({ date: isoDate(d), value: metric === 'orders' ? 0 : '0' });
      }
    } else {
      for (let d = bucketStart; d <= rangeTo; d = addWeeksUtc(d, 1)) {
        points.push({ date: isoDate(d), value: metric === 'orders' ? 0 : '0' });
      }
    }

    const idx = (dateKey: string) => points.findIndex((p) => p.date === dateKey);

    // Try metrics tables first (DailyMetric)
    const metricsWhere: any = {
      workspaceId,
      day: {
        gte: startOfDayUtc(rangeFrom),
        lte: startOfDayUtc(rangeTo),
      },
    };

    const dailyRows = await this.prisma.dailyMetric.findMany({
      where: metricsWhere,
      select: {
        day: true,
        revenue: true,
        orders: true,
        refundsAmount: true,
        feesAmount: true,
        grossMarginAmount: true,
      },
    });

    if (dailyRows.length > 0) {
      const bucketSums = new Map<
        string,
        {
          orders: number;
          revenue: Prisma.Decimal;
          fees: Prisma.Decimal;
          refunds: Prisma.Decimal;
          margin: Prisma.Decimal;
        }
      >();

      for (const r of dailyRows) {
        const keyDate =
          groupBy === 'week' ? isoDate(startOfWeekUtc(r.day)) : isoDate(startOfDayUtc(r.day));

        const cur = bucketSums.get(keyDate) ?? {
          orders: 0,
          revenue: new Prisma.Decimal('0'),
          fees: new Prisma.Decimal('0'),
          refunds: new Prisma.Decimal('0'),
          margin: new Prisma.Decimal('0'),
        };

        cur.orders += r.orders ?? 0;
        cur.revenue = cur.revenue.plus(new Prisma.Decimal(decimalToString(r.revenue)));
        cur.fees = cur.fees.plus(new Prisma.Decimal(decimalToString(r.feesAmount)));
        cur.refunds = cur.refunds.plus(new Prisma.Decimal(decimalToString(r.refundsAmount)));
        cur.margin = cur.margin.plus(new Prisma.Decimal(decimalToString(r.grossMarginAmount)));

        bucketSums.set(keyDate, cur);
      }

      for (const [dateKey, v] of bucketSums.entries()) {
        const i = idx(dateKey);
        if (i === -1) continue;

        if (metric === 'orders') {
          points[i].value = v.orders;
        } else if (metric === 'revenue') {
          points[i].value = decimalToString(v.revenue);
        } else if (metric === 'fees') {
          points[i].value = decimalToString(v.fees);
        } else if (metric === 'refunds') {
          points[i].value = decimalToString(v.refunds);
        } else {
          points[i].value = decimalToString(v.margin);
        }
      }

      return { points };
    }

    // Fallback to raw tables (existing behavior)
    if (metric === 'orders' || metric === 'revenue' || metric === 'margin') {
      const orders = await this.prisma.order.findMany({
        where: {
          workspaceId,
          orderedAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          orderedAt: true,
          total: true,
        },
      });

      let feesTotal = new Prisma.Decimal('0');
      if (metric === 'margin') {
        const feesAgg = await this.prisma.fee.aggregate({
          where: { workspaceId },
          _sum: { amount: true },
        });
        feesTotal = new Prisma.Decimal(decimalToString(feesAgg._sum.amount ?? '0'));
      }

      const bucketSums = new Map<string, { orders: number; revenue: Prisma.Decimal }>();

      for (const o of orders) {
        if (!o.orderedAt) continue;
        const keyDate =
          groupBy === 'week'
            ? isoDate(startOfWeekUtc(o.orderedAt))
            : isoDate(startOfDayUtc(o.orderedAt));

        const cur = bucketSums.get(keyDate) ?? {
          orders: 0,
          revenue: new Prisma.Decimal('0'),
        };

        cur.orders += 1;
        cur.revenue = cur.revenue.plus(new Prisma.Decimal(decimalToString(o.total)));

        bucketSums.set(keyDate, cur);
      }

      for (const [dateKey, v] of bucketSums.entries()) {
        const i = idx(dateKey);
        if (i === -1) continue;

        if (metric === 'orders') {
          points[i].value = v.orders;
        } else if (metric === 'revenue') {
          points[i].value = decimalToString(v.revenue);
        } else {
          const grossMargin = v.revenue.minus(feesTotal);
          points[i].value = decimalToString(grossMargin);
        }
      }

      return { points };
    }

    if (metric === 'fees') {
      const fees = await this.prisma.fee.findMany({
        where: {
          workspaceId,
          createdAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          createdAt: true,
          amount: true,
        },
      });

      const sums = new Map<string, Prisma.Decimal>();
      for (const f of fees) {
        const keyDate =
          groupBy === 'week'
            ? isoDate(startOfWeekUtc(f.createdAt))
            : isoDate(startOfDayUtc(f.createdAt));
        const cur = sums.get(keyDate) ?? new Prisma.Decimal('0');
        sums.set(keyDate, cur.plus(new Prisma.Decimal(decimalToString(f.amount))));
      }

      for (const [dateKey, v] of sums.entries()) {
        const i = idx(dateKey);
        if (i === -1) continue;
        points[i].value = decimalToString(v);
      }

      return { points };
    }

    const refunds = await this.prisma.refund.findMany({
      where: {
        workspaceId,
        createdAt: {
          gte: rangeFrom,
          lte: rangeTo,
        },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    const sums = new Map<string, Prisma.Decimal>();
    for (const r of refunds) {
      const keyDate =
        groupBy === 'week'
          ? isoDate(startOfWeekUtc(r.createdAt))
          : isoDate(startOfDayUtc(r.createdAt));
      const cur = sums.get(keyDate) ?? new Prisma.Decimal('0');
      sums.set(keyDate, cur.plus(new Prisma.Decimal(decimalToString(r.amount))));
    }

    for (const [dateKey, v] of sums.entries()) {
      const i = idx(dateKey);
      if (i === -1) continue;
      points[i].value = decimalToString(v);
    }

    return { points };
  }

  async breakdown(args: DashboardBreakdownArgs) {
    const { workspaceId, by } = args;

    const rangeFrom = args.from ? startOfDayUtc(args.from) : startOfDayUtc(new Date());
    const rangeTo = args.to ? toEndOfDayUtc(args.to) : toEndOfDayUtc(new Date());

    if (by === 'channel') {
      // No channel metric table yet, keep raw
      const orders = await this.prisma.order.findMany({
        where: {
          workspaceId,
          orderedAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          channel: true,
          total: true,
        },
      });

      const totals = new Map<string, Prisma.Decimal>();
      let grand = new Prisma.Decimal('0');

      for (const o of orders) {
        const key = o.channel ?? 'unknown';
        const v = new Prisma.Decimal(decimalToString(o.total));
        const cur = totals.get(key) ?? new Prisma.Decimal('0');
        totals.set(key, cur.plus(v));
        grand = grand.plus(v);
      }

      const items = Array.from(totals.entries())
        .map(([key, value]) => {
          const share = grand.gt(0) ? value.div(grand).mul(100) : new Prisma.Decimal('0');
          return {
            key,
            value: decimalToString(value),
            share: decimalToString(share),
          };
        })
        .sort((a, b) => Number(b.value) - Number(a.value));

      return { items };
    }

    if (by === 'country') {
      const orders = (await (this.prisma.order as any).findMany({
        where: {
          workspaceId,
          orderedAt: {
            gte: rangeFrom,
            lte: rangeTo,
          },
        },
        select: {
          shipCountryCode: true,
          total: true,
        },
      })) as Array<{ shipCountryCode: string | null; total: Prisma.Decimal | string | number }>;

      const totals = new Map<string, Prisma.Decimal>();
      let grand = new Prisma.Decimal('0');

      for (const o of orders) {
        const key = o.shipCountryCode ?? 'unknown';
        const v = new Prisma.Decimal(decimalToString(o.total));
        const cur = totals.get(key) ?? new Prisma.Decimal('0');
        totals.set(key, cur.plus(v));
        grand = grand.plus(v);
      }

      const items = Array.from(totals.entries())
        .map(([key, value]) => {
          const share = grand.gt(0) ? value.div(grand).mul(100) : new Prisma.Decimal('0');
          return {
            key,
            value: decimalToString(value),
            share: decimalToString(share),
          };
        })
        .sort((a, b) => Number(b.value) - Number(a.value));

      return { items };
    }

    if (by === 'sku') {
      // Try metrics tables first (SkuDailyMetric)
      const skuRows = await this.prisma.skuDailyMetric.findMany({
        where: {
          workspaceId,
          day: {
            gte: startOfDayUtc(rangeFrom),
            lte: startOfDayUtc(rangeTo),
          },
        },
        select: {
          revenue: true,
          product: {
            select: {
              sku: true,
            },
          },
        },
      });

      if (skuRows.length > 0) {
        const totals = new Map<string, Prisma.Decimal>();
        let grand = new Prisma.Decimal('0');

        for (const r of skuRows) {
          const key = r.product?.sku ?? 'unknown';
          const v = new Prisma.Decimal(decimalToString(r.revenue));
          const cur = totals.get(key) ?? new Prisma.Decimal('0');
          totals.set(key, cur.plus(v));
          grand = grand.plus(v);
        }

        const items = Array.from(totals.entries())
          .map(([key, value]) => {
            const share = grand.gt(0) ? value.div(grand).mul(100) : new Prisma.Decimal('0');
            return {
              key,
              value: decimalToString(value),
              share: decimalToString(share),
            };
          })
          .sort((a, b) => Number(b.value) - Number(a.value));

        return { items };
      }

      // Fallback to raw
      const rows = await this.prisma.orderItem.findMany({
        where: {
          order: {
            workspaceId,
            orderedAt: {
              gte: rangeFrom,
              lte: rangeTo,
            },
          },
        },
        select: {
          total: true,
          product: {
            select: {
              sku: true,
            },
          },
        },
      });

      const totals = new Map<string, Prisma.Decimal>();
      let grand = new Prisma.Decimal('0');

      for (const r of rows) {
        const key = r.product?.sku ?? 'unknown';
        const v = new Prisma.Decimal(decimalToString(r.total));
        const cur = totals.get(key) ?? new Prisma.Decimal('0');
        totals.set(key, cur.plus(v));
        grand = grand.plus(v);
      }

      const items = Array.from(totals.entries())
        .map(([key, value]) => {
          const share = grand.gt(0) ? value.div(grand).mul(100) : new Prisma.Decimal('0');
          return {
            key,
            value: decimalToString(value),
            share: decimalToString(share),
          };
        })
        .sort((a, b) => Number(b.value) - Number(a.value));

      return { items };
    }

    return { items: [] };
  }

  async alerts(args: DashboardAlertsArgs) {
    const { workspaceId } = args;

    // For v1, alerts are deterministic and derived from raw tables.
    // Date range is accepted to keep contract stable, but not all alerts depend on it yet.
    const rangeFrom = args.from ? startOfDayUtc(args.from) : undefined;
    const rangeTo = args.to ? toEndOfDayUtc(args.to) : undefined;

    const inventoryRows = await this.prisma.inventory.findMany({
      where: { workspaceId },
      select: {
        onHand: true,
      },
    });

    let stockoutsCount = 0;
    let lowStockCount = 0;

    for (const row of inventoryRows) {
      if (row.onHand <= 0) stockoutsCount++;
      else if (row.onHand <= 5) lowStockCount++;
    }

    const alerts: DashboardAlert[] = [];

    const marginThresholdPercent = new Prisma.Decimal('20');
    const criticalThresholdPercent = new Prisma.Decimal('10');
    const warningDropThreshold = new Prisma.Decimal('5');
    const criticalDropThreshold = new Prisma.Decimal('10');

    const computeGrossMarginPercent = async (from?: Date, to?: Date) => {
      const dayWhere: any = { workspaceId };
      if (from || to) {
        dayWhere.day = {};
        if (from) dayWhere.day.gte = startOfDayUtc(from);
        if (to) dayWhere.day.lte = startOfDayUtc(to);
      }

      const metricRows = await this.prisma.dailyMetric.findMany({
        where: dayWhere,
        select: {
          revenue: true,
          grossMarginAmount: true,
        },
      });

      if (metricRows.length > 0) {
        const revenue = metricRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.revenue))),
          new Prisma.Decimal('0'),
        );

        const grossMarginAmount = metricRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.grossMarginAmount))),
          new Prisma.Decimal('0'),
        );

        const grossMarginPercent = revenue.gt(0)
          ? grossMarginAmount.div(revenue).mul(100)
          : new Prisma.Decimal('0');

        return {
          grossMarginPercent,
          source: 'dailyMetric' as const,
        };
      }

      const orderWhere: any = { workspaceId };
      const feeWhere: any = { workspaceId };

      if (from || to) {
        orderWhere.orderedAt = {};
        feeWhere.createdAt = {};
        if (from) {
          orderWhere.orderedAt.gte = startOfDayUtc(from);
          feeWhere.createdAt.gte = startOfDayUtc(from);
        }
        if (to) {
          orderWhere.orderedAt.lte = toEndOfDayUtc(to);
          feeWhere.createdAt.lte = toEndOfDayUtc(to);
        }
      }

      const [ordersAgg, feesAgg] = await Promise.all([
        this.prisma.order.aggregate({
          where: orderWhere,
          _sum: {
            total: true,
          },
        }),
        this.prisma.fee.aggregate({
          where: feeWhere,
          _sum: {
            amount: true,
          },
        }),
      ]);

      const revenue = new Prisma.Decimal(decimalToString(ordersAgg._sum.total ?? '0'));
      const feesAmount = new Prisma.Decimal(decimalToString(feesAgg._sum.amount ?? '0'));
      const grossMarginAmount = revenue.minus(feesAmount);
      const grossMarginPercent = revenue.gt(0)
        ? grossMarginAmount.div(revenue).mul(100)
        : new Prisma.Decimal('0');

      return {
        grossMarginPercent,
        source: 'orders' as const,
      };
    };

    const currentMargin = await computeGrossMarginPercent(rangeFrom, rangeTo);

    // v1 deterministic margin leakage rule:
    // - Warning when gross margin percent is below 20% over the selected range.
    // - Critical when gross margin percent is below 10%, or drops by >=10pp vs previous equivalent window.
    // - Warning when gross margin drops by >=5pp vs previous equivalent window.
    let previousMarginPercent: Prisma.Decimal | null = null;
    let marginDrop: Prisma.Decimal | null = null;

    if (rangeFrom && rangeTo) {
      const windowDays = Math.max(
        1,
        Math.ceil((rangeTo.getTime() - rangeFrom.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const prevTo = addDaysUtc(startOfDayUtc(rangeFrom), -1);
      const prevFrom = addDaysUtc(prevTo, -windowDays + 1);

      const previousMargin = await computeGrossMarginPercent(prevFrom, prevTo);
      previousMarginPercent = previousMargin.grossMarginPercent;
      marginDrop = previousMarginPercent.minus(currentMargin.grossMarginPercent);
    }

    const belowWarning = currentMargin.grossMarginPercent.lt(marginThresholdPercent);
    const belowCritical = currentMargin.grossMarginPercent.lt(criticalThresholdPercent);
    const dropWarning = marginDrop ? marginDrop.gte(warningDropThreshold) : false;
    const dropCritical = marginDrop ? marginDrop.gte(criticalDropThreshold) : false;

    if (belowWarning || dropWarning) {
      const level: AlertLevel = belowCritical || dropCritical ? 'critical' : 'warning';

      const evidenceParts = [
        `current gross margin ${decimalToString(currentMargin.grossMarginPercent)}%`,
        `threshold ${decimalToString(marginThresholdPercent)}%`,
      ];

      if (previousMarginPercent && marginDrop) {
        evidenceParts.push(
          `previous window ${decimalToString(previousMarginPercent)}%`,
          `drop ${decimalToString(marginDrop)}pp`,
        );
      }

      evidenceParts.push(`source ${currentMargin.source}`);

      alerts.push({
        type: 'margin_leakage',
        level,
        title: 'Margin leakage detected',
        message: evidenceParts.join('; '),
      });
    }

    if (stockoutsCount > 0) {
      alerts.push({
        type: 'stockouts',
        level: 'critical',
        title: 'Stockouts detected',
        message: `${stockoutsCount} inventory rows are out of stock`,
        count: stockoutsCount,
      });
    }

    if (lowStockCount > 0) {
      alerts.push({
        type: 'low_stock',
        level: 'warning',
        title: 'Low stock',
        message: `${lowStockCount} inventory rows are low (threshold: 5)`,
        count: lowStockCount,
      });
    }

    const warningRatioMultiplier = new Prisma.Decimal('1.5');
    const criticalRatioMultiplier = new Prisma.Decimal('2');
    const warningAbsoluteDelta = new Prisma.Decimal('1');
    const criticalAbsoluteDelta = new Prisma.Decimal('3');
    const highRefundDayRatioThreshold = new Prisma.Decimal('5');

    const computeRefundRatio = async (from: Date, to: Date) => {
      const normalizedFrom = startOfDayUtc(from);
      const normalizedTo = startOfDayUtc(to);

      const metricRows = await this.prisma.dailyMetric.findMany({
        where: {
          workspaceId,
          day: {
            gte: normalizedFrom,
            lte: normalizedTo,
          },
        },
        select: {
          day: true,
          revenue: true,
          refundsAmount: true,
        },
      });

      if (metricRows.length > 0) {
        const revenue = metricRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.revenue))),
          new Prisma.Decimal('0'),
        );

        const refunds = metricRows.reduce(
          (acc, r) => acc.plus(new Prisma.Decimal(decimalToString(r.refundsAmount))),
          new Prisma.Decimal('0'),
        );

        let highRefundDays = 0;
        for (const r of metricRows) {
          const dayRevenue = new Prisma.Decimal(decimalToString(r.revenue));
          if (dayRevenue.lte(0)) continue;

          const dayRefunds = new Prisma.Decimal(decimalToString(r.refundsAmount));
          const dayRatioPercent = dayRefunds.div(dayRevenue).mul(100);
          if (dayRatioPercent.gte(highRefundDayRatioThreshold)) highRefundDays += 1;
        }

        const ratioPercent = revenue.gt(0) ? refunds.div(revenue).mul(100) : new Prisma.Decimal('0');

        return {
          ratioPercent,
          source: 'dailyMetric' as const,
          highRefundDays,
        };
      }

      const orderWhere: any = {
        workspaceId,
        orderedAt: {
          gte: normalizedFrom,
          lte: toEndOfDayUtc(to),
        },
      };
      const refundsWhere: any = {
        workspaceId,
        createdAt: {
          gte: normalizedFrom,
          lte: toEndOfDayUtc(to),
        },
      };

      const [ordersAgg, refundsAgg] = await Promise.all([
        this.prisma.order.aggregate({
          where: orderWhere,
          _sum: {
            total: true,
          },
        }),
        this.prisma.refund.aggregate({
          where: refundsWhere,
          _sum: {
            amount: true,
          },
        }),
      ]);

      const revenue = new Prisma.Decimal(decimalToString(ordersAgg._sum.total ?? '0'));
      const refunds = new Prisma.Decimal(decimalToString(refundsAgg._sum.amount ?? '0'));
      const ratioPercent = revenue.gt(0) ? refunds.div(revenue).mul(100) : new Prisma.Decimal('0');

      return {
        ratioPercent,
        source: 'orders+refunds' as const,
        highRefundDays: 0,
      };
    };

    if (rangeFrom && rangeTo) {
      const windowDays = Math.max(
        1,
        Math.ceil((rangeTo.getTime() - rangeFrom.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const prevTo = addDaysUtc(startOfDayUtc(rangeFrom), -1);
      const prevFrom = addDaysUtc(prevTo, -windowDays + 1);

      const [currentRefunds, previousRefunds] = await Promise.all([
        computeRefundRatio(rangeFrom, rangeTo),
        computeRefundRatio(prevFrom, prevTo),
      ]);

      const baselineRatio = previousRefunds.ratioPercent;
      const currentRatio = currentRefunds.ratioPercent;
      const ratioDelta = currentRatio.minus(baselineRatio);

      const baselinePositive = baselineRatio.gt(0);
      const ratioMultiple = baselinePositive
        ? currentRatio.div(baselineRatio)
        : currentRatio.gt(warningAbsoluteDelta)
          ? new Prisma.Decimal('999')
          : new Prisma.Decimal('1');

      const warningByMultiplier = baselinePositive && ratioMultiple.gte(warningRatioMultiplier);
      const criticalByMultiplier = baselinePositive && ratioMultiple.gte(criticalRatioMultiplier);
      const warningByDelta = ratioDelta.gte(warningAbsoluteDelta);
      const criticalByDelta = ratioDelta.gte(criticalAbsoluteDelta);

      if (warningByMultiplier || warningByDelta) {
        const level: AlertLevel = criticalByMultiplier || criticalByDelta ? 'critical' : 'warning';

        alerts.push({
          type: 'refund_spikes',
          level,
          title: 'Refund spike detected',
          message: [
            `current refund ratio ${decimalToString(currentRatio)}%`,
            `baseline ${decimalToString(baselineRatio)}%`,
            `delta ${decimalToString(ratioDelta)}pp`,
            baselinePositive ? `multiple ${decimalToString(ratioMultiple)}x` : 'multiple n/a',
            `thresholds warning ${decimalToString(warningRatioMultiplier)}x or +${decimalToString(
              warningAbsoluteDelta,
            )}pp`,
            `source ${currentRefunds.source}`,
          ].join('; '),
          count: currentRefunds.highRefundDays > 0 ? currentRefunds.highRefundDays : undefined,
        });
      }
    }

    // Keep accepted from/to in the payload so frontend can display context if needed
    return {
      from: rangeFrom ? rangeFrom.toISOString() : null,
      to: rangeTo ? rangeTo.toISOString() : null,
      alerts,
    };
  }
}
