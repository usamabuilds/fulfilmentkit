import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export type KpiDateRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export type ToolResult<TName extends string, TData extends object> = {
  tool: TName;
  workspaceId: string;
  range?: KpiDateRange;
  ok: true;
  data: TData;
};

type NumericTotals = Record<string, number | null>;

type TrendMetricKey =
  | 'revenue'
  | 'orders'
  | 'units'
  | 'refundsAmount'
  | 'feesAmount'
  | 'cogsAmount'
  | 'grossMarginAmount'
  | 'grossMarginPercent'
  | 'stockoutsCount'
  | 'lowStockCount';

type TopMoversMetric = 'unitsSold' | 'revenue' | 'refunds' | 'fees' | 'margin';

type SkuAgg = {
  unitsSold: number;
  revenue: number;
  refunds: number;
  fees: number;
  margin: number;
};

type Severity = 'low' | 'medium' | 'high';
type Impact = 'low' | 'medium' | 'high';

type PlanningTopRisk = { title: string; severity: Severity; why: string; evidence: any };
type PlanningOpportunity = { title: string; impact: Impact; why: string; evidence: any };
type PlanningNext7Day = { day: string; actions: string[]; expectedOutcome: string };

type PlanningBlocks = {
  statusBullets: string[];
  topRisks: PlanningTopRisk[];
  opportunities: PlanningOpportunity[];
  next7DaysPlan: PlanningNext7Day[];
  assumptions: any;
};

@Injectable()
export class AiToolsetService {
  constructor(private readonly prisma: PrismaService) {}

  private parseRange(range: KpiDateRange): { from: Date; toExclusive: Date } {
    // We treat `to` as inclusive day. Convert to [from, to+1day) for DateTime filtering.
    const from = new Date(`${range.from}T00:00:00.000Z`);
    const toInclusive = new Date(`${range.to}T00:00:00.000Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
      throw new Error('Invalid date range. Expected YYYY-MM-DD for from/to.');
    }

    const toExclusive = new Date(toInclusive);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    return { from, toExclusive };
  }

  private rangeDaysInclusive(range: KpiDateRange): number {
    const { from, toExclusive } = this.parseRange(range);
    const ms = toExclusive.getTime() - from.getTime();
    const days = Math.round(ms / 86400000);
    return Math.max(1, days);
  }

  private sumDecimal(rows: Array<{ value: any }>): number {
    // Prisma Decimal serializes as string in some contexts; be defensive.
    let total = 0;
    for (const r of rows) {
      const v = r?.value;
      if (v === null || v === undefined) continue;
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      total += n;
    }
    return total;
  }

  private sumInt(rows: Array<{ value: any }>): number {
    let total = 0;
    for (const r of rows) {
      const v = r?.value;
      if (v === null || v === undefined) continue;
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      total += Math.trunc(n);
    }
    return total;
  }

  private safeDiv(numerator: number, denominator: number): number | null {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }

  private safeDeltaPct(delta: number | null, base: number | null): number | null {
    if (delta === null || base === null) return null;
    if (!Number.isFinite(delta) || !Number.isFinite(base) || base === 0) return null;
    return delta / base;
  }

  private takeClamp(limit: number | undefined, def: number, min = 1, max = 200): number {
    return Math.max(min, Math.min(max, limit ?? def));
  }

  private async computeDailyTotals(workspaceId: string, range: KpiDateRange): Promise<NumericTotals> {
    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.dailyMetric.findMany({
      where: {
        workspaceId,
        day: { gte: from, lt: toExclusive },
      },
      select: {
        revenue: true,
        orders: true,
        units: true,
        refundsAmount: true,
        feesAmount: true,
        cogsAmount: true,
        grossMarginAmount: true,
        grossMarginPercent: true,
        stockoutsCount: true,
        lowStockCount: true,
      },
      orderBy: { day: 'asc' },
    });

    const revenue = this.sumDecimal(rows.map((r) => ({ value: r.revenue })));
    const refundsAmount = this.sumDecimal(rows.map((r) => ({ value: r.refundsAmount })));
    const feesAmount = this.sumDecimal(rows.map((r) => ({ value: r.feesAmount })));
    const cogsAmount = this.sumDecimal(rows.map((r) => ({ value: r.cogsAmount })));
    const grossMarginAmount = this.sumDecimal(rows.map((r) => ({ value: r.grossMarginAmount })));

    const orders = this.sumInt(rows.map((r) => ({ value: r.orders })));
    const units = this.sumInt(rows.map((r) => ({ value: r.units })));
    const stockoutsCount = this.sumInt(rows.map((r) => ({ value: r.stockoutsCount })));
    const lowStockCount = this.sumInt(rows.map((r) => ({ value: r.lowStockCount })));

    // Derived KPIs (V1: basic and explainable)
    const avgOrderValue = this.safeDiv(revenue, orders);
    const revenuePerUnit = this.safeDiv(revenue, units);
    const refundRate = this.safeDiv(refundsAmount, revenue);
    const feeRate = this.safeDiv(feesAmount, revenue);

    // Totals-based gross margin percent (ratio 0..1)
    const grossMarginPercent = this.safeDiv(grossMarginAmount, revenue);

    // COGS rate
    const cogsRate = this.safeDiv(cogsAmount, revenue);

    // Average of daily grossMarginPercent (unweighted)
    const avgDailyGrossMarginPercent =
      rows.length === 0
        ? null
        : (() => {
            let s = 0;
            let c = 0;
            for (const r of rows) {
              const v = r.grossMarginPercent;
              if (v === null || v === undefined) continue;
              const n = typeof v === 'number' ? v : Number(v);
              if (!Number.isFinite(n)) continue;
              s += n;
              c += 1;
            }
            if (c === 0) return null;
            return s / c;
          })();

    const totals: NumericTotals = {
      revenue,
      orders,
      units,
      refundsAmount,
      feesAmount,
      cogsAmount,
      grossMarginAmount,
      stockoutsCount,
      lowStockCount,
      avgOrderValue,
      revenuePerUnit,
      refundRate,
      feeRate,
      grossMarginPercent,
      cogsRate,
      avgDailyGrossMarginPercent,
      days: rows.length,
    };

    return totals;
  }

  private normalizeMetricKeys(metricKeys?: string[]): TrendMetricKey[] {
    const allowed: TrendMetricKey[] = [
      'revenue',
      'orders',
      'units',
      'refundsAmount',
      'feesAmount',
      'cogsAmount',
      'grossMarginAmount',
      'grossMarginPercent',
      'stockoutsCount',
      'lowStockCount',
    ];

    const defaultKeys: TrendMetricKey[] = [
      'revenue',
      'orders',
      'units',
      'refundsAmount',
      'feesAmount',
      'grossMarginPercent',
    ];

    if (!metricKeys || metricKeys.length === 0) return defaultKeys;

    const cleaned: TrendMetricKey[] = [];
    for (const k of metricKeys) {
      if (allowed.includes(k as TrendMetricKey)) cleaned.push(k as TrendMetricKey);
    }

    return cleaned.length > 0 ? cleaned : defaultKeys;
  }

  private metricValueFromSkuAgg(metric: TopMoversMetric, agg: SkuAgg) {
    if (metric === 'unitsSold') return agg.unitsSold;
    if (metric === 'revenue') return agg.revenue;
    if (metric === 'refunds') return agg.refunds;
    if (metric === 'fees') return agg.fees;
    return agg.margin;
  }

  private async getOrdersInRange(workspaceId: string, range: KpiDateRange) {
    const { from, toExclusive } = this.parseRange(range);

    // Orders in range:
    // - orderedAt within range
    // - OR (orderedAt is null AND createdAt within range)
    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        OR: [
          { orderedAt: { gte: from, lt: toExclusive } },
          { orderedAt: null, createdAt: { gte: from, lt: toExclusive } },
        ],
      },
      select: {
        id: true,
        total: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderIds = orders.map((o) => o.id);
    const revenue = this.sumDecimal(orders.map((o) => ({ value: o.total })));

    return { from, toExclusive, orders, orderIds, revenue };
  }

  private async sumFeesAndRefundsForOrders(args: {
    workspaceId: string;
    from: Date;
    toExclusive: Date;
    orderIds: string[];
  }) {
    const { workspaceId, from, toExclusive, orderIds } = args;

    if (orderIds.length === 0) {
      return { feesAmount: 0, refundsAmount: 0 };
    }

    const [fees, refunds] = await Promise.all([
      this.prisma.fee.findMany({
        where: {
          workspaceId,
          createdAt: { gte: from, lt: toExclusive },
          orderId: { in: orderIds },
        },
        select: { amount: true },
      }),
      this.prisma.refund.findMany({
        where: {
          workspaceId,
          createdAt: { gte: from, lt: toExclusive },
          orderId: { in: orderIds },
        },
        select: { amount: true },
      }),
    ]);

    const feesAmount = this.sumDecimal(fees.map((f) => ({ value: f.amount })));
    const refundsAmount = this.sumDecimal(refunds.map((r) => ({ value: r.amount })));

    return { feesAmount, refundsAmount };
  }

  private async computeSkuAggByRange(workspaceId: string, range: KpiDateRange): Promise<Record<string, SkuAgg>> {
    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.skuDailyMetric.findMany({
      where: {
        workspaceId,
        day: { gte: from, lt: toExclusive },
      },
      select: {
        unitsSold: true,
        revenue: true,
        refundsAmount: true,
        feesAmount: true,
        product: { select: { sku: true } },
      },
    });

    const bySku: Record<string, SkuAgg> = {};

    for (const r of rows) {
      const sku = r.product?.sku ?? 'UNKNOWN';
      if (!bySku[sku]) bySku[sku] = { unitsSold: 0, revenue: 0, refunds: 0, fees: 0, margin: 0 };

      const unitsSold = this.sumInt([{ value: r.unitsSold }]);
      const revenue = this.sumDecimal([{ value: r.revenue }]);
      const refunds = this.sumDecimal([{ value: r.refundsAmount }]);
      const fees = this.sumDecimal([{ value: r.feesAmount }]);

      bySku[sku].unitsSold += unitsSold;
      bySku[sku].revenue += revenue;
      bySku[sku].refunds += refunds;
      bySku[sku].fees += fees;
      bySku[sku].margin += revenue - refunds - fees;
    }

    return bySku;
  }

  private fmtPct(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'n/a';
    return `${(value * 100).toFixed(1)}%`;
  }

  private fmtMoney(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'n/a';
    return value.toFixed(2);
  }

  private sevScore(sev: Severity): number {
    if (sev === 'high') return 3;
    if (sev === 'medium') return 2;
    return 1;
  }

  private next7Dates(range: KpiDateRange): string[] {
    // Plan starts the day after the provided range.to (UTC)
    const toInclusive = new Date(`${range.to}T00:00:00.000Z`);
    const start = new Date(toInclusive);
    start.setUTCDate(start.getUTCDate() + 1);

    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  private previousRangeSameLength(range: KpiDateRange): KpiDateRange {
    const days = this.rangeDaysInclusive(range);

    const from = new Date(`${range.from}T00:00:00.000Z`);
    const to = new Date(`${range.to}T00:00:00.000Z`);

    const prevTo = new Date(to);
    prevTo.setUTCDate(prevTo.getUTCDate() - days);

    const prevFrom = new Date(from);
    prevFrom.setUTCDate(prevFrom.getUTCDate() - days);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { from: fmt(prevFrom), to: fmt(prevTo) };
  }

  // -------------------------
  // KPI tools (structured JSON)
  // -------------------------

  async getKpiSummary(args: { workspaceId: string; range: KpiDateRange }) {
    const { workspaceId, range } = args;

    const totals = await this.computeDailyTotals(workspaceId, range);

    const result: ToolResult<
      'getKpiSummary',
      {
        note: string;
        totals: NumericTotals;
      }
    > = {
      tool: 'getKpiSummary',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Computed from DailyMetric totals for the workspace and inclusive date range. Rates are basic V1 ratios.',
        totals,
      },
    };

    return result;
  }

  async getKpiDeltas(args: { workspaceId: string; range: KpiDateRange; compareTo: KpiDateRange }) {
    const { workspaceId, range, compareTo } = args;

    const [current, previous] = await Promise.all([
      this.computeDailyTotals(workspaceId, range),
      this.computeDailyTotals(workspaceId, compareTo),
    ]);

    const keys: Array<keyof NumericTotals> = [
      'revenue',
      'orders',
      'units',
      'refundsAmount',
      'feesAmount',
      'cogsAmount',
      'grossMarginAmount',
      'stockoutsCount',
      'lowStockCount',
      'avgOrderValue',
      'refundRate',
      'feeRate',
      'grossMarginPercent',
      'cogsRate',
    ];

    const deltas: Record<string, { value: number | null; delta: number | null; deltaPct: number | null }> = {};

    for (const key of keys) {
      const cur = current[key] ?? null;
      const prev = previous[key] ?? null;

      const value = cur;
      const delta = cur === null || prev === null ? null : cur - prev;
      const deltaPct = this.safeDeltaPct(delta, prev);

      deltas[String(key)] = { value, delta, deltaPct };
    }

    const result: ToolResult<
      'getKpiDeltas',
      {
        note: string;
        primaryRange: KpiDateRange;
        compareTo: KpiDateRange;
        deltas: Record<string, { value: number | null; delta: number | null; deltaPct: number | null }>;
      }
    > = {
      tool: 'getKpiDeltas',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Computed deltas between two ranges using DailyMetric totals. deltaPct is delta / compareTo value.',
        primaryRange: range,
        compareTo,
        deltas,
      },
    };

    return result;
  }

  async getTrends(args: { workspaceId: string; range: KpiDateRange; metricKeys?: string[] }) {
    const { workspaceId, range, metricKeys } = args;

    const keys = this.normalizeMetricKeys(metricKeys);
    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.dailyMetric.findMany({
      where: {
        workspaceId,
        day: { gte: from, lt: toExclusive },
      },
      select: {
        day: true,
        revenue: true,
        orders: true,
        units: true,
        refundsAmount: true,
        feesAmount: true,
        cogsAmount: true,
        grossMarginAmount: true,
        grossMarginPercent: true,
        stockoutsCount: true,
        lowStockCount: true,
      },
      orderBy: { day: 'asc' },
    });

    const points = rows.map((r) => {
      const values: Record<string, number | null> = {};

      for (const k of keys) {
        const raw = (r as any)[k];
        if (raw === null || raw === undefined) {
          values[k] = null;
          continue;
        }
        const n = typeof raw === 'number' ? raw : Number(raw);
        values[k] = Number.isFinite(n) ? n : null;
      }

      const date = r.day.toISOString().slice(0, 10);
      return { date, values };
    });

    const result: ToolResult<
      'getTrends',
      {
        note: string;
        metricKeys: string[];
        points: Array<{ date: string; values: Record<string, number | null> }>;
      }
    > = {
      tool: 'getTrends',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Time series per day from DailyMetric for the workspace and inclusive date range.',
        metricKeys: keys,
        points,
      },
    };

    return result;
  }

  async getBreakdown(args: {
    workspaceId: string;
    range: KpiDateRange;
    by: 'channel' | 'platform' | 'location' | 'sku';
    limit?: number;
  }) {
    const { workspaceId, range, by, limit } = args;

    const take = this.takeClamp(limit, 25);

    // -------------------------
    // SKU breakdown
    // -------------------------
    if (by === 'sku') {
      const { from, toExclusive } = this.parseRange(range);

      const rows = await this.prisma.skuDailyMetric.findMany({
        where: {
          workspaceId,
          day: { gte: from, lt: toExclusive },
        },
        select: {
          unitsSold: true,
          revenue: true,
          refundsAmount: true,
          feesAmount: true,
          avgPrice: true,
          stockEnd: true,
          product: {
            select: { sku: true, id: true },
          },
        },
      });

      const bySku: Record<
        string,
        {
          productId: string;
          unitsSold: number;
          revenue: number;
          refundsAmount: number;
          feesAmount: number;
          avgPriceSum: number;
          avgPriceCount: number;
          stockEnd: number | null;
        }
      > = {};

      for (const r of rows) {
        const sku = r.product?.sku ?? 'UNKNOWN';
        const productId = r.product?.id ?? 'UNKNOWN';

        if (!bySku[sku]) {
          bySku[sku] = {
            productId,
            unitsSold: 0,
            revenue: 0,
            refundsAmount: 0,
            feesAmount: 0,
            avgPriceSum: 0,
            avgPriceCount: 0,
            stockEnd: null,
          };
        }

        bySku[sku].unitsSold += this.sumInt([{ value: r.unitsSold }]);
        bySku[sku].revenue += this.sumDecimal([{ value: r.revenue }]);
        bySku[sku].refundsAmount += this.sumDecimal([{ value: r.refundsAmount }]);
        bySku[sku].feesAmount += this.sumDecimal([{ value: r.feesAmount }]);

        const ap = r.avgPrice;
        if (ap !== null && ap !== undefined) {
          const n = typeof ap === 'number' ? ap : Number(ap);
          if (Number.isFinite(n)) {
            bySku[sku].avgPriceSum += n;
            bySku[sku].avgPriceCount += 1;
          }
        }

        const se = r.stockEnd;
        if (se !== null && se !== undefined) {
          const n = typeof se === 'number' ? se : Number(se);
          if (Number.isFinite(n)) bySku[sku].stockEnd = Math.trunc(n);
        }
      }

      const items = Object.entries(bySku).map(([sku, agg]) => {
        const avgPrice = agg.avgPriceCount === 0 ? null : this.safeDiv(agg.avgPriceSum, agg.avgPriceCount);

        return {
          key: sku,
          values: {
            unitsSold: agg.unitsSold,
            revenue: agg.revenue,
            refundsAmount: agg.refundsAmount,
            feesAmount: agg.feesAmount,
            avgPrice,
            stockEnd: agg.stockEnd,
          },
        };
      });

      items.sort((a, b) => (b.values.revenue ?? 0) - (a.values.revenue ?? 0));

      const result: ToolResult<
        'getBreakdown',
        {
          note: string;
          by: string;
          limit: number;
          rows: Array<{ key: string; values: Record<string, number | null> }>;
        }
      > = {
        tool: 'getBreakdown',
        workspaceId,
        range,
        ok: true,
        data: {
          note: 'SKU breakdown from SkuDailyMetric aggregated over the inclusive date range.',
          by,
          limit: take,
          rows: items.slice(0, take),
        },
      };

      return result;
    }

    // -------------------------
    // CHANNEL + PLATFORM breakdown
    // -------------------------
    if (by === 'channel' || by === 'platform') {
      const { from, toExclusive } = this.parseRange(range);

      const orders = await this.prisma.order.findMany({
        where: {
          workspaceId,
          OR: [
            { orderedAt: { gte: from, lt: toExclusive } },
            { orderedAt: null, createdAt: { gte: from, lt: toExclusive } },
          ],
        },
        select: {
          id: true,
          channel: true,
          total: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const orderIds = orders.map((o) => o.id);

      const items = orderIds.length
        ? await this.prisma.orderItem.findMany({
            where: { orderId: { in: orderIds } },
            select: { orderId: true, quantity: true },
          })
        : [];

      const unitsByOrderId = new Map<string, number>();
      for (const it of items) {
        unitsByOrderId.set(it.orderId, (unitsByOrderId.get(it.orderId) ?? 0) + (it.quantity ?? 0));
      }

      const fees = orderIds.length
        ? await this.prisma.fee.findMany({
            where: {
              workspaceId,
              createdAt: { gte: from, lt: toExclusive },
              orderId: { in: orderIds },
            },
            select: { orderId: true, amount: true },
          })
        : [];

      const refunds = orderIds.length
        ? await this.prisma.refund.findMany({
            where: {
              workspaceId,
              createdAt: { gte: from, lt: toExclusive },
              orderId: { in: orderIds },
            },
            select: { orderId: true, amount: true },
          })
        : [];

      const feeSumByOrderId = new Map<string, number>();
      for (const f of fees) {
        const n = Number(f.amount);
        if (!Number.isFinite(n)) continue;
        feeSumByOrderId.set(f.orderId!, (feeSumByOrderId.get(f.orderId!) ?? 0) + n);
      }

      const refundSumByOrderId = new Map<string, number>();
      for (const r of refunds) {
        const n = Number(r.amount);
        if (!Number.isFinite(n)) continue;
        refundSumByOrderId.set(r.orderId!, (refundSumByOrderId.get(r.orderId!) ?? 0) + n);
      }

      type Agg = {
        orders: number;
        revenue: number;
        units: number;
        refundsAmount: number;
        feesAmount: number;
      };

      const byKey: Record<string, Agg> = {};

      for (const o of orders) {
        const key = (o.channel && o.channel.trim().length > 0 ? o.channel : 'UNKNOWN') as string;

        if (!byKey[key]) {
          byKey[key] = { orders: 0, revenue: 0, units: 0, refundsAmount: 0, feesAmount: 0 };
        }

        byKey[key].orders += 1;

        const rev = Number(o.total);
        if (Number.isFinite(rev)) byKey[key].revenue += rev;

        const units = unitsByOrderId.get(o.id) ?? 0;
        byKey[key].units += units;

        byKey[key].feesAmount += feeSumByOrderId.get(o.id) ?? 0;
        byKey[key].refundsAmount += refundSumByOrderId.get(o.id) ?? 0;
      }

      const rows = Object.entries(byKey).map(([key, agg]) => {
        const avgOrderValue = this.safeDiv(agg.revenue, agg.orders);
        const refundRate = this.safeDiv(agg.refundsAmount, agg.revenue);
        const feeRate = this.safeDiv(agg.feesAmount, agg.revenue);
        const marginApprox = agg.revenue - agg.refundsAmount - agg.feesAmount;

        return {
          key,
          values: {
            orders: agg.orders,
            revenue: agg.revenue,
            units: agg.units,
            refundsAmount: agg.refundsAmount,
            feesAmount: agg.feesAmount,
            avgOrderValue,
            refundRate,
            feeRate,
            marginApprox: Number.isFinite(marginApprox) ? marginApprox : null,
          },
        };
      });

      rows.sort((a, b) => (b.values.revenue ?? 0) - (a.values.revenue ?? 0));

      const note =
        by === 'channel'
          ? 'Channel breakdown from Order + OrderItem + Fee + Refund (workspace-scoped). Revenue uses Order.total. Fees/Refunds are linked by orderId and filtered by createdAt in range.'
          : 'Platform breakdown from Order + OrderItem + Fee + Refund (workspace-scoped). V1: platform key is derived from Order.channel for now. Revenue uses Order.total. Fees/Refunds are linked by orderId and filtered by createdAt in range.';

      const result: ToolResult<
        'getBreakdown',
        {
          note: string;
          by: string;
          limit: number;
          rows: Array<{ key: string; values: Record<string, number | null> }>;
        }
      > = {
        tool: 'getBreakdown',
        workspaceId,
        range,
        ok: true,
        data: {
          note,
          by,
          limit: take,
          rows: rows.slice(0, take),
        },
      };

      return result;
    }

    // -------------------------
    // LOCATION breakdown
    // Revenue/fees/refunds allocated by units per location for multi-location orders
    // -------------------------
    if (by === 'location') {
      const { from, toExclusive } = this.parseRange(range);

      const orders = await this.prisma.order.findMany({
        where: {
          workspaceId,
          OR: [
            { orderedAt: { gte: from, lt: toExclusive } },
            { orderedAt: null, createdAt: { gte: from, lt: toExclusive } },
          ],
        },
        select: {
          id: true,
          total: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const orderIds = orders.map((o) => o.id);

      const orderItems = orderIds.length
        ? await this.prisma.orderItem.findMany({
            where: { orderId: { in: orderIds } },
            select: {
              orderId: true,
              quantity: true,
              locationId: true,
              location: { select: { code: true } },
            },
          })
        : [];

      const fees = orderIds.length
        ? await this.prisma.fee.findMany({
            where: {
              workspaceId,
              createdAt: { gte: from, lt: toExclusive },
              orderId: { in: orderIds },
            },
            select: { orderId: true, amount: true },
          })
        : [];

      const refunds = orderIds.length
        ? await this.prisma.refund.findMany({
            where: {
              workspaceId,
              createdAt: { gte: from, lt: toExclusive },
              orderId: { in: orderIds },
            },
            select: { orderId: true, amount: true },
          })
        : [];

      const feeSumByOrderId = new Map<string, number>();
      for (const f of fees) {
        const n = Number(f.amount);
        if (!Number.isFinite(n)) continue;
        feeSumByOrderId.set(f.orderId!, (feeSumByOrderId.get(f.orderId!) ?? 0) + n);
      }

      const refundSumByOrderId = new Map<string, number>();
      for (const r of refunds) {
        const n = Number(r.amount);
        if (!Number.isFinite(n)) continue;
        refundSumByOrderId.set(r.orderId!, (refundSumByOrderId.get(r.orderId!) ?? 0) + n);
      }

      const orderTotalUnits = new Map<string, number>();
      const unitsByOrderLocation = new Map<string, Map<string, number>>(); // orderId -> (locKey -> units)

      for (const it of orderItems) {
        const orderId = it.orderId;
        const units = it.quantity ?? 0;
        const locKey = it.location?.code ?? 'UNKNOWN';

        orderTotalUnits.set(orderId, (orderTotalUnits.get(orderId) ?? 0) + units);

        if (!unitsByOrderLocation.get(orderId)) unitsByOrderLocation.set(orderId, new Map());
        const m = unitsByOrderLocation.get(orderId)!;
        m.set(locKey, (m.get(locKey) ?? 0) + units);
      }

      type Agg = {
        orders: number;
        revenue: number;
        units: number;
        refundsAmount: number;
        feesAmount: number;
      };

      const byLocation: Record<string, Agg> = {};

      for (const o of orders) {
        const totalUnits = orderTotalUnits.get(o.id) ?? 0;
        const perLoc = unitsByOrderLocation.get(o.id) ?? new Map<string, number>();

        const revenue = Number(o.total);
        const feesAmount = feeSumByOrderId.get(o.id) ?? 0;
        const refundsAmount = refundSumByOrderId.get(o.id) ?? 0;

        // If order has no items (or no location), dump it into UNKNOWN as 100%
        if (totalUnits <= 0 || perLoc.size === 0) {
          const key = 'UNKNOWN';
          if (!byLocation[key]) byLocation[key] = { orders: 0, revenue: 0, units: 0, refundsAmount: 0, feesAmount: 0 };
          byLocation[key].orders += 1;
          if (Number.isFinite(revenue)) byLocation[key].revenue += revenue;
          byLocation[key].units += totalUnits;
          byLocation[key].feesAmount += feesAmount;
          byLocation[key].refundsAmount += refundsAmount;
          continue;
        }

        // This order "counts" for every location it touches
        for (const [locKey, locUnits] of perLoc.entries()) {
          const ratio = locUnits / totalUnits;

          if (!byLocation[locKey]) {
            byLocation[locKey] = { orders: 0, revenue: 0, units: 0, refundsAmount: 0, feesAmount: 0 };
          }

          byLocation[locKey].orders += 1;
          byLocation[locKey].units += locUnits;

          if (Number.isFinite(revenue)) byLocation[locKey].revenue += revenue * ratio;
          byLocation[locKey].feesAmount += feesAmount * ratio;
          byLocation[locKey].refundsAmount += refundsAmount * ratio;
        }
      }

      const rows = Object.entries(byLocation).map(([key, agg]) => {
        const avgOrderValue = this.safeDiv(agg.revenue, agg.orders);
        const refundRate = this.safeDiv(agg.refundsAmount, agg.revenue);
        const feeRate = this.safeDiv(agg.feesAmount, agg.revenue);
        const marginApprox = agg.revenue - agg.refundsAmount - agg.feesAmount;

        return {
          key,
          values: {
            orders: agg.orders,
            revenue: agg.revenue,
            units: agg.units,
            refundsAmount: agg.refundsAmount,
            feesAmount: agg.feesAmount,
            avgOrderValue,
            refundRate,
            feeRate,
            marginApprox: Number.isFinite(marginApprox) ? marginApprox : null,
          },
        };
      });

      rows.sort((a, b) => (b.values.revenue ?? 0) - (a.values.revenue ?? 0));

      const result: ToolResult<
        'getBreakdown',
        {
          note: string;
          by: string;
          limit: number;
          rows: Array<{ key: string; values: Record<string, number | null> }>;
        }
      > = {
        tool: 'getBreakdown',
        workspaceId,
        range,
        ok: true,
        data: {
          note: 'Location breakdown from OrderItem.locationId -> Location.code (workspace-scoped). V1: if an order spans multiple locations, revenue/fees/refunds are allocated proportionally by units per location. Fees/Refunds are linked by orderId and filtered by createdAt in range.',
          by,
          limit: take,
          rows: rows.slice(0, take),
        },
      };

      return result;
    }

    // Fallback (should not happen)
    return {
      tool: 'getBreakdown',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'V1: unsupported breakdown key.',
        by,
        limit: take,
        rows: [],
      },
    };
  }

  // ✅ UPDATED: optional compareTo now supported (delta + deltaPct)
  async getTopMovers(args: {
    workspaceId: string;
    range: KpiDateRange;
    compareTo?: KpiDateRange;
    metric: 'unitsSold' | 'revenue' | 'refunds' | 'fees' | 'margin';
    direction: 'up' | 'down';
    limit?: number;
  }) {
    const { workspaceId, range, compareTo, metric, direction, limit } = args;

    const take = this.takeClamp(limit, 25);

    const currentMap = await this.computeSkuAggByRange(workspaceId, range);
    const previousMap = compareTo ? await this.computeSkuAggByRange(workspaceId, compareTo) : null;

    const allSkus = new Set<string>(Object.keys(currentMap));
    if (previousMap) {
      for (const sku of Object.keys(previousMap)) allSkus.add(sku);
    }

    const items = Array.from(allSkus).map((sku) => {
      const curAgg = currentMap[sku] ?? { unitsSold: 0, revenue: 0, refunds: 0, fees: 0, margin: 0 };
      const prevAgg = previousMap?.[sku] ?? { unitsSold: 0, revenue: 0, refunds: 0, fees: 0, margin: 0 };

      const curValue = this.metricValueFromSkuAgg(metric, curAgg);
      const prevValue = compareTo ? this.metricValueFromSkuAgg(metric, prevAgg) : null;

      const value = Number.isFinite(curValue) ? curValue : null;

      let delta: number | null = null;
      let deltaPct: number | null = null;

      if (compareTo) {
        const pv = Number.isFinite(prevValue as number) ? (prevValue as number) : 0;
        delta = value === null ? null : value - pv;
        deltaPct = this.safeDeltaPct(delta, pv);
      }

      return {
        key: sku,
        value,
        delta,
        deltaPct,
      };
    });

    const sortNumber = (n: number | null, fallback: number) => (n === null || !Number.isFinite(n) ? fallback : n);

    // If compareTo exists, "movers" should sort by delta. Otherwise, sort by current value.
    const sortKey = compareTo ? 'delta' : 'value';

    items.sort((a, b) => {
      const av = sortNumber(
        (a as any)[sortKey],
        direction === 'up' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      );
      const bv = sortNumber(
        (b as any)[sortKey],
        direction === 'up' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      );

      // up => biggest first, down => smallest first
      return direction === 'up' ? bv - av : av - bv;
    });

    const result: ToolResult<
      'getTopMovers',
      {
        note: string;
        metric: string;
        direction: string;
        limit: number;
        primaryRange: KpiDateRange;
        compareTo?: KpiDateRange;
        sortBy: 'value' | 'delta';
        items: Array<{ key: string; value: number | null; delta: number | null; deltaPct: number | null }>;
      }
    > = {
      tool: 'getTopMovers',
      workspaceId,
      range,
      ok: true,
      data: {
        note: compareTo
          ? 'Top movers by SKU from SkuDailyMetric aggregated over the inclusive date ranges. value is current metric total. delta is current minus compareTo. deltaPct is delta / compareTo value (null when compareTo value is 0).'
          : 'Top movers by SKU from SkuDailyMetric aggregated over the inclusive date range.',
        metric,
        direction,
        limit: take,
        primaryRange: range,
        compareTo,
        sortBy: compareTo ? 'delta' : 'value',
        items: items.slice(0, take),
      },
    };

    return result;
  }

  // ✅ IMPLEMENTED (V1): basic, explainable issue detection
  async getOrderIssues(args: { workspaceId: string; range: KpiDateRange; limit?: number }) {
    const { workspaceId, range, limit } = args;

    const take = this.takeClamp(limit, 50);
    const sampleSize = Math.min(5, take);

    const { from, toExclusive } = this.parseRange(range);

    const orders = await this.prisma.order.findMany({
      where: {
        workspaceId,
        OR: [
          { orderedAt: { gte: from, lt: toExclusive } },
          { orderedAt: null, createdAt: { gte: from, lt: toExclusive } },
        ],
      },
      select: {
        id: true,
        currency: true,
        total: true,
        subtotal: true,
        tax: true,
        shipping: true,
        status: true,
        createdAt: true,
        orderedAt: true,
        _count: { select: { items: true, fees: true, refunds: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderById = new Map<
      string,
      {
        id: string;
        currency: string;
        total: any;
        subtotal: any;
        tax: any;
        shipping: any;
        status: string;
        createdAt: Date;
        orderedAt: Date | null;
        counts: { items: number; fees: number; refunds: number };
      }
    >();

    for (const o of orders) {
      orderById.set(o.id, {
        id: o.id,
        currency: o.currency,
        total: o.total,
        subtotal: o.subtotal,
        tax: o.tax,
        shipping: o.shipping,
        status: o.status,
        createdAt: o.createdAt,
        orderedAt: o.orderedAt ?? null,
        counts: {
          items: o._count.items,
          fees: o._count.fees,
          refunds: o._count.refunds,
        },
      });
    }

    const fees = await this.prisma.fee.findMany({
      where: {
        workspaceId,
        createdAt: { gte: from, lt: toExclusive },
      },
      select: {
        id: true,
        orderId: true,
        currency: true,
        amount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const refunds = await this.prisma.refund.findMany({
      where: {
        workspaceId,
        createdAt: { gte: from, lt: toExclusive },
      },
      select: {
        id: true,
        orderId: true,
        currency: true,
        amount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersMissingItems = orders.filter((o) => (o._count?.items ?? 0) === 0);
    const feesWithoutOrder = fees.filter((f) => !f.orderId);
    const refundsWithoutOrder = refunds.filter((r) => !r.orderId);

    const negativeMoneyOrders = orders.filter((o) => {
      const total = Number(o.total);
      const subtotal = Number(o.subtotal);
      const tax = Number(o.tax);
      const shipping = Number(o.shipping);

      const bad =
        (Number.isFinite(total) && total < 0) ||
        (Number.isFinite(subtotal) && subtotal < 0) ||
        (Number.isFinite(tax) && tax < 0) ||
        (Number.isFinite(shipping) && shipping < 0);

      return bad;
    });

    const currencyMismatchOrderIds = new Set<string>();

    for (const f of fees) {
      if (!f.orderId) continue;
      const o = orderById.get(f.orderId);
      if (!o) continue;
      if (o.currency && f.currency && o.currency !== f.currency) currencyMismatchOrderIds.add(o.id);
    }

    for (const r of refunds) {
      if (!r.orderId) continue;
      const o = orderById.get(r.orderId);
      if (!o) continue;
      if (o.currency && r.currency && o.currency !== r.currency) currencyMismatchOrderIds.add(o.id);
    }

    const refundSumByOrderId = new Map<string, number>();

    for (const r of refunds) {
      if (!r.orderId) continue;
      const amt = Number(r.amount);
      if (!Number.isFinite(amt)) continue;
      refundSumByOrderId.set(r.orderId, (refundSumByOrderId.get(r.orderId) ?? 0) + amt);
    }

    const refundExceedsTotalOrderIds: string[] = [];
    for (const [orderId, sumRefund] of refundSumByOrderId.entries()) {
      const o = orderById.get(orderId);
      if (!o) continue;

      const total = Number(o.total);
      if (!Number.isFinite(total)) continue;

      if (sumRefund > total) refundExceedsTotalOrderIds.push(orderId);
    }

    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      count: number | null;
      sampleOrderIds: string[];
    }> = [];

    const pushIssue = (issue: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      count: number | null;
      sampleOrderIds: string[];
    }) => {
      issues.push(issue);
    };

    if (ordersMissingItems.length > 0) {
      pushIssue({
        type: 'orders_missing_items',
        severity: 'high',
        message: 'Orders exist in the range but have zero OrderItem rows.',
        count: ordersMissingItems.length,
        sampleOrderIds: ordersMissingItems.slice(0, sampleSize).map((o) => o.id),
      });
    }

    if (feesWithoutOrder.length > 0) {
      pushIssue({
        type: 'fees_without_order',
        severity: 'medium',
        message: 'Fee records exist in the range but are not linked to any Order (orderId is null).',
        count: feesWithoutOrder.length,
        sampleOrderIds: [],
      });
    }

    if (refundsWithoutOrder.length > 0) {
      pushIssue({
        type: 'refunds_without_order',
        severity: 'medium',
        message: 'Refund records exist in the range but are not linked to any Order (orderId is null).',
        count: refundsWithoutOrder.length,
        sampleOrderIds: [],
      });
    }

    if (negativeMoneyOrders.length > 0) {
      pushIssue({
        type: 'negative_money_fields',
        severity: 'high',
        message: 'One or more orders have negative total/subtotal/tax/shipping.',
        count: negativeMoneyOrders.length,
        sampleOrderIds: negativeMoneyOrders.slice(0, sampleSize).map((o) => o.id),
      });
    }

    if (currencyMismatchOrderIds.size > 0) {
      const ids = Array.from(currencyMismatchOrderIds);
      pushIssue({
        type: 'currency_mismatch',
        severity: 'high',
        message: 'Order currency does not match linked fee/refund currency for one or more orders.',
        count: ids.length,
        sampleOrderIds: ids.slice(0, sampleSize),
      });
    }

    if (refundExceedsTotalOrderIds.length > 0) {
      pushIssue({
        type: 'refunds_exceed_order_total',
        severity: 'high',
        message: 'Sum of refunds in the range exceeds the order total for one or more orders.',
        count: refundExceedsTotalOrderIds.length,
        sampleOrderIds: refundExceedsTotalOrderIds.slice(0, sampleSize),
      });
    }

    const result: ToolResult<
      'getOrderIssues',
      {
        note: string;
        limit: number;
        issues: Array<{
          type: string;
          severity: 'low' | 'medium' | 'high';
          message: string;
          count: number | null;
          sampleOrderIds: string[];
        }>;
      }
    > = {
      tool: 'getOrderIssues',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'V1 issues detection using Order/OrderItem/Fee/Refund tables. Workspace-scoped. Range uses orderedAt when present, else createdAt.',
        limit: take,
        issues: issues.slice(0, take),
      },
    };

    return result;
  }

  // -------------------------
  // Risk tools (structured JSON)
  // -------------------------

  async getStockoutRisk(args: { workspaceId: string; range: KpiDateRange; horizonDays?: number; limit?: number }) {
    const { workspaceId, range, horizonDays, limit } = args;

    const take = this.takeClamp(limit, 50);
    const horizon = Math.max(1, Math.min(90, horizonDays ?? 14));
    const days = this.rangeDaysInclusive(range);
    const { from, toExclusive } = this.parseRange(range);

    const inv = await this.prisma.inventory.findMany({
      where: { workspaceId },
      select: {
        onHand: true,
        productId: true,
        locationId: true,
        product: { select: { sku: true } },
        location: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const productIds = Array.from(new Set(inv.map((i) => i.productId)));

    const skuMetrics = productIds.length
      ? await this.prisma.skuDailyMetric.findMany({
          where: {
            workspaceId,
            productId: { in: productIds },
            day: { gte: from, lt: toExclusive },
          },
          select: {
            productId: true,
            unitsSold: true,
          },
        })
      : [];

    const unitsSoldByProduct = new Map<string, number>();
    for (const r of skuMetrics) {
      unitsSoldByProduct.set(r.productId, (unitsSoldByProduct.get(r.productId) ?? 0) + (r.unitsSold ?? 0));
    }

    const items = inv.map((row) => {
      const sku = row.product?.sku ?? 'UNKNOWN';
      const locationCode = row.location?.code ?? 'UNKNOWN';
      const onHand = row.onHand ?? 0;

      const totalUnitsSold = unitsSoldByProduct.get(row.productId) ?? 0;
      const avgDailyUnits = totalUnitsSold / days;

      let daysLeft: number | null = null;
      if (avgDailyUnits > 0) daysLeft = onHand / avgDailyUnits;

      let risk: 'low' | 'medium' | 'high' = 'low';
      if (onHand <= 0) risk = 'high';
      else if (daysLeft !== null && Number.isFinite(daysLeft)) {
        if (daysLeft <= 3) risk = 'high';
        else if (daysLeft <= horizon) risk = 'medium';
      }

      return {
        sku,
        productId: row.productId,
        locationCode,
        onHand,
        avgDailyUnits: Number.isFinite(avgDailyUnits) ? avgDailyUnits : null,
        daysLeft: daysLeft !== null && Number.isFinite(daysLeft) ? daysLeft : null,
        risk,
      };
    });

    const score = (r: { risk: 'low' | 'medium' | 'high'; daysLeft: number | null }) => {
      const base = r.risk === 'high' ? 0 : r.risk === 'medium' ? 1 : 2;
      const d = r.daysLeft === null ? 999999 : r.daysLeft;
      return base * 1000000 + d;
    };

    items.sort((a, b) => score(a) - score(b));

    const result: ToolResult<
      'stockout_risk',
      {
        note: string;
        horizonDays: number;
        limit: number;
        items: Array<{
          sku: string;
          productId?: string;
          locationCode?: string;
          onHand: number | null;
          avgDailyUnits: number | null;
          daysLeft: number | null;
          risk: 'low' | 'medium' | 'high';
        }>;
      }
    > = {
      tool: 'stockout_risk',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Stockout risk combines Inventory.onHand with avg daily units from SkuDailyMetric over the provided date range (workspace-scoped). daysLeft = onHand / avgDailyUnits. Risk: onHand=0 => high; daysLeft<=3 => high; daysLeft<=horizon => medium.',
        horizonDays: horizon,
        limit: take,
        items: items.slice(0, take),
      },
    };

    return result;
  }

  async getLowStockRisk(args: { workspaceId: string; threshold?: number; limit?: number }) {
    const { workspaceId, threshold, limit } = args;

    const take = this.takeClamp(limit, 50);
    const th = Math.max(1, Math.min(100000, threshold ?? 10));

    const inv = await this.prisma.inventory.findMany({
      where: { workspaceId },
      select: {
        onHand: true,
        productId: true,
        product: { select: { sku: true } },
        location: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const items = inv
      .filter((r) => (r.onHand ?? 0) > 0 && (r.onHand ?? 0) < th)
      .map((r) => {
        const onHand = r.onHand ?? 0;
        const sku = r.product?.sku ?? 'UNKNOWN';
        const locationCode = r.location?.code ?? 'UNKNOWN';

        let risk: 'low' | 'medium' | 'high' = 'medium';
        if (onHand <= Math.ceil(th / 2)) risk = 'high';

        return {
          sku,
          productId: r.productId,
          locationCode,
          onHand,
          risk,
        };
      });

    items.sort((a, b) => (a.onHand ?? 0) - (b.onHand ?? 0));

    const result: ToolResult<
      'low_stock_risk',
      {
        note: string;
        threshold: number;
        limit: number;
        items: Array<{
          sku: string;
          productId?: string;
          locationCode?: string;
          onHand: number | null;
          risk: 'low' | 'medium' | 'high';
        }>;
      }
    > = {
      tool: 'low_stock_risk',
      workspaceId,
      ok: true,
      data: {
        note: 'Low stock risk scans Inventory.onHand per SKU per location (workspace-scoped). Included: 0 < onHand < threshold. Risk: onHand <= threshold/2 => high, else medium.',
        threshold: th,
        limit: take,
        items: items.slice(0, take),
      },
    };

    return result;
  }

  async getRefundSpikeRisk(args: { workspaceId: string; range: KpiDateRange; compareTo: KpiDateRange }) {
    const { workspaceId, range, compareTo } = args;

    const cur = await this.getOrdersInRange(workspaceId, range);
    const prev = await this.getOrdersInRange(workspaceId, compareTo);

    const curMoney = await this.sumFeesAndRefundsForOrders({
      workspaceId,
      from: cur.from,
      toExclusive: cur.toExclusive,
      orderIds: cur.orderIds,
    });

    const prevMoney = await this.sumFeesAndRefundsForOrders({
      workspaceId,
      from: prev.from,
      toExclusive: prev.toExclusive,
      orderIds: prev.orderIds,
    });

    const curRefundRate = this.safeDiv(curMoney.refundsAmount, cur.revenue);
    const prevRefundRate = this.safeDiv(prevMoney.refundsAmount, prev.revenue);

    const delta = curRefundRate === null || prevRefundRate === null ? null : curRefundRate - prevRefundRate;
    const deltaPct = this.safeDeltaPct(delta, prevRefundRate);

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (delta !== null && delta > 0.02) risk = 'medium';
    if (delta !== null && delta > 0.05) risk = 'high';

    const result: ToolResult<
      'refund_spike_risk',
      {
        note: string;
        primaryRange: KpiDateRange;
        compareTo: KpiDateRange;
        risk: 'low' | 'medium' | 'high';
        refundRate: { value: number | null; delta: number | null; deltaPct: number | null };
      }
    > = {
      tool: 'refund_spike_risk',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Refund spike risk compares refundRate between two ranges. refundRate = sum(Refund.amount linked to orders in range by createdAt) / sum(Order.total). Orders are filtered by orderedAt when present, else createdAt (workspace-scoped). Risk: delta > 2pp => medium; delta > 5pp => high.',
        primaryRange: range,
        compareTo,
        risk,
        refundRate: { value: curRefundRate, delta, deltaPct },
      },
    };

    return result;
  }

  async getFeeSpikeRisk(args: { workspaceId: string; range: KpiDateRange; compareTo: KpiDateRange }) {
    const { workspaceId, range, compareTo } = args;

    const cur = await this.getOrdersInRange(workspaceId, range);
    const prev = await this.getOrdersInRange(workspaceId, compareTo);

    const curMoney = await this.sumFeesAndRefundsForOrders({
      workspaceId,
      from: cur.from,
      toExclusive: cur.toExclusive,
      orderIds: cur.orderIds,
    });

    const prevMoney = await this.sumFeesAndRefundsForOrders({
      workspaceId,
      from: prev.from,
      toExclusive: prev.toExclusive,
      orderIds: prev.orderIds,
    });

    const curFeeRate = this.safeDiv(curMoney.feesAmount, cur.revenue);
    const prevFeeRate = this.safeDiv(prevMoney.feesAmount, prev.revenue);

    const delta = curFeeRate === null || prevFeeRate === null ? null : curFeeRate - prevFeeRate;
    const deltaPct = this.safeDeltaPct(delta, prevFeeRate);

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (delta !== null && delta > 0.01) risk = 'medium';
    if (delta !== null && delta > 0.03) risk = 'high';

    const result: ToolResult<
      'fee_spike_risk',
      {
        note: string;
        primaryRange: KpiDateRange;
        compareTo: KpiDateRange;
        risk: 'low' | 'medium' | 'high';
        feeRate: { value: number | null; delta: number | null; deltaPct: number | null };
      }
    > = {
      tool: 'fee_spike_risk',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Fee spike risk compares feeRate between two ranges. feeRate = sum(Fee.amount linked to orders in range by createdAt) / sum(Order.total). Orders are filtered by orderedAt when present, else createdAt (workspace-scoped). Risk: delta > 1pp => medium; delta > 3pp => high.',
        primaryRange: range,
        compareTo,
        risk,
        feeRate: { value: curFeeRate, delta, deltaPct },
      },
    };

    return result;
  }

  async getMarginLeakageRisk(args: { workspaceId: string; range: KpiDateRange; compareTo?: KpiDateRange }) {
    const { workspaceId, range, compareTo } = args;

    const cur = await this.getOrdersInRange(workspaceId, range);
    const curMoney = await this.sumFeesAndRefundsForOrders({
      workspaceId,
      from: cur.from,
      toExclusive: cur.toExclusive,
      orderIds: cur.orderIds,
    });

    const curMarginAmt = cur.revenue - curMoney.refundsAmount - curMoney.feesAmount;
    const curMarginPct = this.safeDiv(curMarginAmt, cur.revenue);

    let prevMarginPct: number | null = null;
    if (compareTo) {
      const prev = await this.getOrdersInRange(workspaceId, compareTo);
      const prevMoney = await this.sumFeesAndRefundsForOrders({
        workspaceId,
        from: prev.from,
        toExclusive: prev.toExclusive,
        orderIds: prev.orderIds,
      });
      const prevMarginAmt = prev.revenue - prevMoney.refundsAmount - prevMoney.feesAmount;
      prevMarginPct = this.safeDiv(prevMarginAmt, prev.revenue);
    }

    const delta = curMarginPct === null || prevMarginPct === null ? null : curMarginPct - prevMarginPct;
    const deltaPct = this.safeDeltaPct(delta, prevMarginPct);

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (curMarginPct !== null) {
      if (curMarginPct < 0.4) risk = 'high';
      else if (curMarginPct < 0.6) risk = 'medium';
    }

    const drivers: Array<{ label: string; impact: number | null }> = [
      { label: 'refundsAmount', impact: Number.isFinite(curMoney.refundsAmount) ? -curMoney.refundsAmount : null },
      { label: 'feesAmount', impact: Number.isFinite(curMoney.feesAmount) ? -curMoney.feesAmount : null },
    ];

    const result: ToolResult<
      'margin_leakage',
      {
        note: string;
        primaryRange: KpiDateRange;
        compareTo?: KpiDateRange;
        risk: 'low' | 'medium' | 'high';
        marginPct: { value: number | null; delta: number | null; deltaPct: number | null };
        drivers: Array<{ label: string; impact: number | null }>;
      }
    > = {
      tool: 'margin_leakage',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Margin leakage uses Order totals minus linked refunds and fees in the range (workspace-scoped). marginPct = (revenue - refunds - fees) / revenue. Drivers include refunds and fees impact.',
        primaryRange: range,
        compareTo,
        risk,
        marginPct: { value: curMarginPct, delta, deltaPct },
        drivers,
      },
    };

    return result;
  }

  async getOpsRisk(args: { workspaceId: string; range: KpiDateRange }) {
    const { workspaceId, range } = args;

    const [issues, stockout, lowStock] = await Promise.all([
      this.getOrderIssues({ workspaceId, range, limit: 50 }),
      this.getStockoutRisk({ workspaceId, range, horizonDays: 14, limit: 50 }),
      this.getLowStockRisk({ workspaceId, threshold: 10, limit: 50 }),
    ]);

    const highOrderIssues = (issues.data.issues ?? []).filter((i) => i.severity === 'high').length;
    const highStockout = (stockout.data.items ?? []).filter((i) => i.risk === 'high').length;
    const highLowStock = (lowStock.data.items ?? []).filter((i) => i.risk === 'high').length;

    const signals: Array<{ signal: string; severity: 'low' | 'medium' | 'high'; value: number | null; message: string }> =
      [];

    signals.push({
      signal: 'order_issues_high',
      severity: highOrderIssues > 0 ? 'high' : 'low',
      value: highOrderIssues,
      message: highOrderIssues > 0 ? 'High severity order issues detected in range.' : 'No high severity order issues.',
    });

    signals.push({
      signal: 'stockout_high',
      severity: highStockout > 0 ? 'high' : 'low',
      value: highStockout,
      message: highStockout > 0 ? 'Stockouts detected (onHand = 0).' : 'No stockouts detected.',
    });

    signals.push({
      signal: 'low_stock_high',
      severity: highLowStock > 0 ? 'medium' : 'low',
      value: highLowStock,
      message: highLowStock > 0 ? 'Very low stock detected for some items.' : 'No very low stock detected.',
    });

    let risk: 'low' | 'medium' | 'high' = 'low';
    if (highOrderIssues > 0 || highStockout > 0) risk = 'high';
    else if (highLowStock > 0) risk = 'medium';

    const result: ToolResult<
      'ops_risk',
      {
        note: string;
        risk: 'low' | 'medium' | 'high';
        signals: Array<{ signal: string; severity: 'low' | 'medium' | 'high'; value: number | null; message: string }>;
      }
    > = {
      tool: 'ops_risk',
      workspaceId,
      range,
      ok: true,
      data: {
        note: 'Ops risk combines V1 signals: high severity order issues, stockouts, and very low stock (workspace-scoped). This is intentionally simple and explainable in V1.',
        risk,
        signals,
      },
    };

    return result;
  }

  // -------------------------
  // Planning-grade output (structured blocks)
  // -------------------------
  async getPlanningOutput(args: { workspaceId: string; range: KpiDateRange }) {
    const { workspaceId, range } = args;

    const compareTo = this.previousRangeSameLength(range);

    const [kpi, ops, stockout, lowStock, margin, refundSpike, feeSpike] = await Promise.all([
      this.getKpiSummary({ workspaceId, range }),
      this.getOpsRisk({ workspaceId, range }),
      this.getStockoutRisk({ workspaceId, range, horizonDays: 14, limit: 20 }),
      this.getLowStockRisk({ workspaceId, threshold: 10, limit: 20 }),
      this.getMarginLeakageRisk({ workspaceId, range, compareTo }),
      this.getRefundSpikeRisk({ workspaceId, range, compareTo }),
      this.getFeeSpikeRisk({ workspaceId, range, compareTo }),
    ]);

    const totals = kpi.data.totals;

    const statusBullets: string[] = [];
    statusBullets.push(`Range: ${range.from} to ${range.to} (inclusive, UTC).`);
    statusBullets.push(
      `Revenue: ${this.fmtMoney(totals.revenue)} | Orders: ${totals.orders ?? 0} | Units: ${totals.units ?? 0}`,
    );
    statusBullets.push(`Refund rate: ${this.fmtPct(totals.refundRate)} | Fee rate: ${this.fmtPct(totals.feeRate)}`);
    statusBullets.push(
      `Gross margin: ${this.fmtPct(totals.grossMarginPercent)} | GM amount: ${this.fmtMoney(totals.grossMarginAmount)}`,
    );
    statusBullets.push(`Stockouts (count): ${totals.stockoutsCount ?? 0} | Low stock (count): ${totals.lowStockCount ?? 0}`);

    const topRisks: PlanningTopRisk[] = [];

    topRisks.push({
      title: 'Ops risk (combined signals)',
      severity: ops.data.risk as Severity,
      why: ops.data.signals.map((s) => s.message).join(' '),
      evidence: { opsRisk: ops.data },
    });

    const stockoutHigh = (stockout.data.items ?? []).filter((i) => i.risk === 'high').slice(0, 5);
    if (stockoutHigh.length > 0) {
      topRisks.push({
        title: 'Stockouts detected (onHand = 0)',
        severity: 'high',
        why: 'One or more SKUs are currently stocked out. This can cause missed sales and delayed fulfillment.',
        evidence: { items: stockoutHigh },
      });
    }

    const lowStockHigh = (lowStock.data.items ?? []).filter((i) => i.risk === 'high').slice(0, 5);
    if (lowStockHigh.length > 0) {
      topRisks.push({
        title: 'Very low stock detected',
        severity: 'medium',
        why: 'Some SKUs are below the low stock threshold and may stock out soon.',
        evidence: { items: lowStockHigh, threshold: (lowStock.data as any).threshold ?? 10 },
      });
    }

    topRisks.push({
      title: 'Margin leakage risk',
      severity: margin.data.risk as Severity,
      why: `Margin percent is ${this.fmtPct(margin.data.marginPct.value)} for the range. Drivers are refunds and fees.`,
      evidence: {
        marginPct: margin.data.marginPct,
        drivers: margin.data.drivers,
        compareTo: margin.data.compareTo ?? compareTo,
      },
    });

    topRisks.push({
      title: 'Refund spike risk',
      severity: refundSpike.data.risk as Severity,
      why: `Refund rate is ${this.fmtPct(refundSpike.data.refundRate.value)} vs prior period ${compareTo.from} to ${compareTo.to}.`,
      evidence: { refundRate: refundSpike.data.refundRate, compareTo },
    });

    topRisks.push({
      title: 'Fee spike risk',
      severity: feeSpike.data.risk as Severity,
      why: `Fee rate is ${this.fmtPct(feeSpike.data.feeRate.value)} vs prior period ${compareTo.from} to ${compareTo.to}.`,
      evidence: { feeRate: feeSpike.data.feeRate, compareTo },
    });

    topRisks.sort((a, b) => this.sevScore(b.severity) - this.sevScore(a.severity));
    const topRisksTrimmed = topRisks.slice(0, 7);

    const opportunities: PlanningOpportunity[] = [];

    if (totals.feeRate !== null && totals.feeRate > 0.02) {
      opportunities.push({
        title: 'Reduce fee rate',
        impact: totals.feeRate > 0.04 ? 'high' : 'medium',
        why: `Fee rate is ${this.fmtPct(totals.feeRate)}. Even small reductions improve margin directly.`,
        evidence: { feeRate: totals.feeRate, feesAmount: totals.feesAmount, revenue: totals.revenue },
      });
    }

    if (totals.refundRate !== null && totals.refundRate > 0.01) {
      opportunities.push({
        title: 'Reduce refunds',
        impact: totals.refundRate > 0.03 ? 'high' : 'medium',
        why: `Refund rate is ${this.fmtPct(totals.refundRate)}. Reducing refunds improves margin and cash flow.`,
        evidence: { refundRate: totals.refundRate, refundsAmount: totals.refundsAmount, revenue: totals.revenue },
      });
    }

    if (stockoutHigh.length > 0 || lowStockHigh.length > 0) {
      opportunities.push({
        title: 'Restock fast-moving SKUs',
        impact: stockoutHigh.length > 0 ? 'high' : 'medium',
        why: 'Restocking prevents missed orders and improves service levels.',
        evidence: { stockouts: stockoutHigh, lowStock: lowStockHigh },
      });
    }

    const hasHighOrderIssues = (ops.data.signals ?? []).some(
      (s) => s.signal === 'order_issues_high' && s.severity === 'high',
    );
    if (hasHighOrderIssues) {
      opportunities.push({
        title: 'Fix high severity order issues',
        impact: 'high',
        why: 'High severity issues create downstream reporting and reconciliation problems. Fixing them improves trust in numbers.',
        evidence: { opsSignals: ops.data.signals },
      });
    }

    if (margin.data.marginPct.value !== null && margin.data.marginPct.value < 0.6) {
      opportunities.push({
        title: 'Improve margin percent',
        impact: margin.data.marginPct.value < 0.4 ? 'high' : 'medium',
        why: `Margin percent is ${this.fmtPct(margin.data.marginPct.value)}. Reducing refunds and fees is the fastest V1 lever.`,
        evidence: { marginPct: margin.data.marginPct, drivers: margin.data.drivers },
      });
    }

    const impactScore = (i: Impact) => (i === 'high' ? 3 : i === 'medium' ? 2 : 1);
    opportunities.sort((a, b) => impactScore(b.impact) - impactScore(a.impact));
    const opportunitiesTrimmed = opportunities.slice(0, 7);

    const dates = this.next7Dates(range);

    const next7DaysPlan: PlanningNext7Day[] = dates.map((day) => {
      const actions: string[] = [];

      if (day === dates[0]) {
        actions.push('Review ops risk signals and confirm which issues are real vs demo data artifacts.');
        actions.push('List all stocked out and very low stock SKUs by location and confirm restock plan.');
      } else if (day === dates[1]) {
        actions.push('Investigate refund drivers for the range and tag top causes (damaged, wrong item, late delivery, etc.).');
        actions.push('Investigate fee drivers and confirm whether they are payment, platform, or shipping related.');
      } else if (day === dates[2]) {
        actions.push('Fix high severity order issues first (missing items, currency mismatch, refunds exceeding total).');
      } else if (day === dates[3]) {
        actions.push('Prioritize restock for stockout and low stock SKUs with highest velocity.');
      } else if (day === dates[4]) {
        actions.push('Re-run KPI summary and compare to prior period to verify improvement direction.');
      } else if (day === dates[5]) {
        actions.push('Create simple checks to prevent recurring issues (validation rules, ingestion checks, mapping sanity checks).');
      } else {
        actions.push('Document what changed and what remains unknown, then decide next automation workstream.');
      }

      return {
        day,
        actions,
        expectedOutcome: 'Clear, prioritized actions tied to measured risks using only internal data.',
      };
    });

    const assumptions = {
      noExternalWebData: true,
      dateRange: { from: range.from, to: range.to },
      dataScope: {
        workspaceScoped: true,
        workspaceId,
        sources: ['DailyMetric', 'SkuDailyMetric', 'Inventory', 'Order', 'OrderItem', 'Fee', 'Refund'],
        notes: [
          'No external web data',
          'UTC day boundaries',
          'Orders filtered by orderedAt when present, else createdAt',
          'Refund and fee sums filtered by createdAt and linked to orderId in range',
        ],
      },
      compareRangeUsedForSpikeChecks: {
        from: compareTo.from,
        to: compareTo.to,
        note: 'Compare range is previous period with same length as primary range, shifted back by N days.',
      },
      v1DeliberatelyIgnored: [
        'Health endpoint not required for V1 completeness (even if it exists)',
        'No production-grade monitoring',
        'No webhook signature verification',
        'No full external API sync logic',
        'No retry or DLQ architecture beyond basics',
        'No advanced idempotency beyond basic DB unique constraints',
        'No metrics backfill jobs',
        'No real user auth system',
        'No real role-based enforcement beyond basic guards',
        'No pagination optimization',
        'No rate limiting',
        'No audit logging',
        'No key rotation',
        'No production secrets management',
        'No performance optimization focus yet',
      ],
    };

    const blocks: PlanningBlocks = {
      statusBullets,
      topRisks: topRisksTrimmed,
      opportunities: opportunitiesTrimmed,
      next7DaysPlan,
      assumptions,
    };

    const result: ToolResult<'getPlanningOutput', PlanningBlocks> = {
      tool: 'getPlanningOutput',
      workspaceId,
      range,
      ok: true,
      data: blocks,
    };

    return result;
  }
}
