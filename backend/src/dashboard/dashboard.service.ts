import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

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

type AlertType = 'stockouts' | 'low_stock' | 'margin_leakage' | 'refund_spikes';
type AlertLevel = 'critical' | 'warning' | 'info';

type DashboardAlert = {
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  count?: number;
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
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
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

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

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

        const grossMarginPercent =
          revenue.gt(0) ? grossMarginAmount.div(revenue).mul(100) : new Prisma.Decimal('0');

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
    const grossMarginPercent =
      revenue.gt(0) ? grossMarginAmount.div(revenue).mul(100) : new Prisma.Decimal('0');

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

    const bucketStart =
      groupBy === 'week' ? startOfWeekUtc(rangeFrom) : startOfDayUtc(rangeFrom);

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
          groupBy === 'week'
            ? isoDate(startOfWeekUtc(r.day))
            : isoDate(startOfDayUtc(r.day));

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

    // Placeholders allowed v1
    alerts.push({
      type: 'margin_leakage',
      level: 'info',
      title: 'Margin leakage monitoring',
      message: 'Margin leakage detection will be enabled in a later milestone',
    });

    alerts.push({
      type: 'refund_spikes',
      level: 'info',
      title: 'Refund spike monitoring',
      message: 'Refund spike detection will be enabled in a later milestone',
    });

    // Keep accepted from/to in the payload so frontend can display context if needed
    return {
      from: rangeFrom ? rangeFrom.toISOString() : null,
      to: rangeTo ? rangeTo.toISOString() : null,
      alerts,
    };
  }
}
