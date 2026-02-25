import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type DateRange = { from: string; to: string };

type CreateForecastArgs = {
  workspaceId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  horizonDays?: number;

  // SKU-level forecast selectors
  sku?: string;
  productId?: string;

  method?: string;
};

type ForecastPoint = {
  day: string; // YYYY-MM-DD
  revenue: number | null;
  orders: number | null;
  units: number | null;
};

type ForecastResult = {
  level: 'workspace' | 'sku';
  sku?: string;
  productId?: string;
  method: string;
  range: DateRange;
  horizonDays: number;
  assumptions: any;
  forecast: {
    totals: {
      revenue: number | null;
      orders: number | null;
      units: number | null;
    };
    daily: ForecastPoint[];
  };
};

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  private parseRange(range: DateRange): { from: Date; toExclusive: Date } {
    const from = new Date(`${range.from}T00:00:00.000Z`);
    const toInclusive = new Date(`${range.to}T00:00:00.000Z`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
      throw new Error('Invalid date range. Expected YYYY-MM-DD for from/to.');
    }

    const toExclusive = new Date(toInclusive);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    return { from, toExclusive };
  }

  private rangeDaysInclusive(range: DateRange): number {
    const { from, toExclusive } = this.parseRange(range);
    const ms = toExclusive.getTime() - from.getTime();
    const days = Math.round(ms / 86400000);
    return Math.max(1, days);
  }

  private safeDiv(n: number, d: number): number | null {
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return n / d;
  }

  private sumNum(values: any[]): number {
    let t = 0;
    for (const v of values) {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      t += n;
    }
    return t;
  }

  private sumInt(values: any[]): number {
    let t = 0;
    for (const v of values) {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      t += Math.trunc(n);
    }
    return t;
  }

  private nextDates(startDayInclusive: string, horizonDays: number): string[] {
    const start = new Date(`${startDayInclusive}T00:00:00.000Z`);
    const days: string[] = [];
    for (let i = 0; i < horizonDays; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  private dayAfter(rangeToInclusive: string): string {
    const d = new Date(`${rangeToInclusive}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  private async computeWorkspaceDailyAvg(workspaceId: string, range: DateRange) {
    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.dailyMetric.findMany({
      where: { workspaceId, day: { gte: from, lt: toExclusive } },
      select: {
        revenue: true,
        orders: true,
        units: true,
      },
      orderBy: { day: 'asc' },
    });

    const daysWithData = rows.length;
    const revenueTotal = this.sumNum(rows.map((r) => r.revenue));
    const ordersTotal = this.sumInt(rows.map((r) => r.orders));
    const unitsTotal = this.sumInt(rows.map((r) => r.units));

    const daysInRange = this.rangeDaysInclusive(range);

    // Average per calendar day (range length), not per row count.
    const avgRevenuePerDay = this.safeDiv(revenueTotal, daysInRange);
    const avgOrdersPerDay = this.safeDiv(ordersTotal, daysInRange);
    const avgUnitsPerDay = this.safeDiv(unitsTotal, daysInRange);

    return {
      daysInRange,
      daysWithData,
      revenueTotal,
      ordersTotal,
      unitsTotal,
      avgRevenuePerDay,
      avgOrdersPerDay,
      avgUnitsPerDay,
    };
  }

  private async computeSkuDailyAvgByProductId(
    workspaceId: string,
    range: DateRange,
    productId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { workspaceId, id: productId },
      select: { id: true, sku: true },
    });

    if (!product) {
      return {
        ok: false as const,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `productId not found in this workspace: ${productId}`,
        },
      };
    }

    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.skuDailyMetric.findMany({
      where: {
        workspaceId,
        productId: product.id,
        day: { gte: from, lt: toExclusive },
      },
      select: {
        revenue: true,
        unitsSold: true,
      },
      orderBy: { day: 'asc' },
    });

    const daysWithData = rows.length;
    const revenueTotal = this.sumNum(rows.map((r) => r.revenue));
    const unitsTotal = this.sumInt(rows.map((r) => r.unitsSold));

    const daysInRange = this.rangeDaysInclusive(range);

    const avgRevenuePerDay = this.safeDiv(revenueTotal, daysInRange);
    const avgUnitsPerDay = this.safeDiv(unitsTotal, daysInRange);

    return {
      ok: true as const,
      productId: product.id,
      sku: product.sku,
      daysInRange,
      daysWithData,
      revenueTotal,
      unitsTotal,
      avgRevenuePerDay,
      avgUnitsPerDay,
    };
  }

  private async computeSkuDailyAvgBySku(workspaceId: string, range: DateRange, sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { workspaceId, sku },
      select: { id: true, sku: true },
    });

    if (!product) {
      return {
        ok: false as const,
        error: {
          code: 'SKU_NOT_FOUND',
          message: `SKU not found in this workspace: ${sku}`,
        },
      };
    }

    const { from, toExclusive } = this.parseRange(range);

    const rows = await this.prisma.skuDailyMetric.findMany({
      where: {
        workspaceId,
        productId: product.id,
        day: { gte: from, lt: toExclusive },
      },
      select: {
        revenue: true,
        unitsSold: true,
      },
      orderBy: { day: 'asc' },
    });

    const daysWithData = rows.length;
    const revenueTotal = this.sumNum(rows.map((r) => r.revenue));
    const unitsTotal = this.sumInt(rows.map((r) => r.unitsSold));

    const daysInRange = this.rangeDaysInclusive(range);

    const avgRevenuePerDay = this.safeDiv(revenueTotal, daysInRange);
    const avgUnitsPerDay = this.safeDiv(unitsTotal, daysInRange);

    return {
      ok: true as const,
      productId: product.id,
      sku: product.sku,
      daysInRange,
      daysWithData,
      revenueTotal,
      unitsTotal,
      avgRevenuePerDay,
      avgUnitsPerDay,
    };
  }

  async createForecast(args: CreateForecastArgs) {
    const { workspaceId, from, to, horizonDays, sku, productId, method } = args;

    const range: DateRange = { from, to };
    const horizon = Math.max(1, Math.min(365, horizonDays ?? 14));
    const chosenMethod = method ?? 'naive_daily_avg_v1';

    const startDay = this.dayAfter(range.to);
    const futureDays = this.nextDates(startDay, horizon);

    // -------------------------
    // SKU-level forecast (by sku OR productId)
    // -------------------------
    const hasSku = !!sku && sku.trim().length > 0;
    const hasProductId = !!productId && productId.trim().length > 0;

    if (hasSku || hasProductId) {
      const skuAvg = hasProductId
        ? await this.computeSkuDailyAvgByProductId(workspaceId, range, productId!.trim())
        : await this.computeSkuDailyAvgBySku(workspaceId, range, sku!.trim());

      if (!skuAvg.ok) {
        return {
          success: false,
          error: skuAvg.error,
        };
      }

      const daily: ForecastPoint[] = futureDays.map((day) => ({
        day,
        revenue: skuAvg.avgRevenuePerDay,
        orders: null,
        units: skuAvg.avgUnitsPerDay,
      }));

      const totals = {
        revenue: skuAvg.avgRevenuePerDay === null ? null : skuAvg.avgRevenuePerDay * horizon,
        orders: null,
        units: skuAvg.avgUnitsPerDay === null ? null : skuAvg.avgUnitsPerDay * horizon,
      };

      const assumptions = {
        noExternalWebData: true,
        method: chosenMethod,
        level: 'sku',
        dateRange: range,
        forecastHorizonDays: horizon,
        forecastStartsOn: startDay,
        workspaceScoped: true,
        workspaceId,
        sku: skuAvg.sku,
        productId: skuAvg.productId,
        dataScope: {
          sources: ['SkuDailyMetric', 'Product'],
          notes: [
            'UTC day boundaries',
            'Average is computed per calendar day in range (daysInRange), not per row count',
            'SKU-level V1 forecasts revenue and units only',
          ],
        },
        trainingWindow: {
          daysInRange: skuAvg.daysInRange,
          daysWithData: skuAvg.daysWithData,
        },
      };

      const result: ForecastResult = {
        level: 'sku',
        sku: skuAvg.sku,
        productId: skuAvg.productId,
        method: chosenMethod,
        range,
        horizonDays: horizon,
        assumptions,
        forecast: { totals, daily },
      };

      const { from: fromDt, toExclusive: toEx } = this.parseRange(range);

      const created = await this.prisma.forecast.create({
        data: {
          workspaceId,
          productId: skuAvg.productId,
          level: 'SKU',
          method: chosenMethod,
          from: fromDt,
          to: toEx,
          horizonDays: horizon,
          assumptions,
          result,
        },
        select: { id: true, createdAt: true, updatedAt: true },
      });

      return {
        success: true,
        data: {
          id: created.id,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          ...result,
        },
      };
    }

    // -------------------------
    // Workspace-level forecast
    // -------------------------
    const wsAvg = await this.computeWorkspaceDailyAvg(workspaceId, range);

    const daily: ForecastPoint[] = futureDays.map((day) => ({
      day,
      revenue: wsAvg.avgRevenuePerDay,
      orders: wsAvg.avgOrdersPerDay,
      units: wsAvg.avgUnitsPerDay,
    }));

    const totals = {
      revenue: wsAvg.avgRevenuePerDay === null ? null : wsAvg.avgRevenuePerDay * horizon,
      orders: wsAvg.avgOrdersPerDay === null ? null : wsAvg.avgOrdersPerDay * horizon,
      units: wsAvg.avgUnitsPerDay === null ? null : wsAvg.avgUnitsPerDay * horizon,
    };

    const assumptions = {
      noExternalWebData: true,
      method: chosenMethod,
      level: 'workspace',
      dateRange: range,
      forecastHorizonDays: horizon,
      forecastStartsOn: startDay,
      workspaceScoped: true,
      workspaceId,
      dataScope: {
        sources: ['DailyMetric'],
        notes: [
          'UTC day boundaries',
          'Average is computed per calendar day in range (daysInRange), not per row count',
          'Workspace-level V1 forecasts revenue, orders, units',
        ],
      },
      trainingWindow: {
        daysInRange: wsAvg.daysInRange,
        daysWithData: wsAvg.daysWithData,
      },
      trainingTotals: {
        revenue: wsAvg.revenueTotal,
        orders: wsAvg.ordersTotal,
        units: wsAvg.unitsTotal,
      },
    };

    const result: ForecastResult = {
      level: 'workspace',
      method: chosenMethod,
      range,
      horizonDays: horizon,
      assumptions,
      forecast: { totals, daily },
    };

    const { from: fromDt, toExclusive: toEx } = this.parseRange(range);

    const created = await this.prisma.forecast.create({
      data: {
        workspaceId,
        productId: null,
        level: 'WORKSPACE',
        method: chosenMethod,
        from: fromDt,
        to: toEx,
        horizonDays: horizon,
        assumptions,
        result,
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    return {
      success: true,
      data: {
        id: created.id,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        ...result,
      },
    };
  }
}
