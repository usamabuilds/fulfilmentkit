import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type DateRangePreset,
  type RegionOption,
  type ReportComputationOutput,
  type ReportFiltersByKey,
  type ReportPlatform,
  type TimeGroupingOption,
} from '../../orders/reporting/orders-reports.service';

type CustomerOrderPoint = {
  customerId: string;
  orderedAt: Date;
  total: number;
};

@Injectable()
export class CustomerReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runNewVsReturningCustomers(
    workspaceId: string,
    filters: ReportFiltersByKey['new-vs-returning-customers'],
  ): Promise<ReportComputationOutput> {
    const firstOrderByCustomer = await this.getFirstOrderDateByCustomer(workspaceId);
    const orders = await this.getOrdersForCustomerReports(workspaceId, filters);

    if (orders.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        summary: `No customer orders found in ${filters.dateRange} (${filters.groupBy} grouping).`,
      };
    }

    const buckets = new Map<string, { periodStart: Date; newCustomers: Set<string>; returningCustomers: Set<string> }>();
    for (const order of orders) {
      const firstOrderAt = firstOrderByCustomer.get(order.customerId);
      if (!firstOrderAt) {
        continue;
      }

      const periodStart = this.normalizeToPeriodStart(order.orderedAt, filters.groupBy);
      const periodKey = periodStart.toISOString();
      const bucket = buckets.get(periodKey) ?? {
        periodStart,
        newCustomers: new Set<string>(),
        returningCustomers: new Set<string>(),
      };

      const firstPeriodStart = this.normalizeToPeriodStart(firstOrderAt, filters.groupBy);
      if (firstPeriodStart.getTime() === periodStart.getTime()) {
        bucket.newCustomers.add(order.customerId);
      } else if (firstPeriodStart.getTime() < periodStart.getTime()) {
        bucket.returningCustomers.add(order.customerId);
      }
      buckets.set(periodKey, bucket);
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: this.formatPeriodLabel(bucket.periodStart, filters.groupBy),
        newCustomers: bucket.newCustomers.size,
        returningCustomers: bucket.returningCustomers.size,
      }));

    const newCount = chartRows.reduce((sum, row) => sum + row.newCustomers, 0);
    const returningCount = chartRows.reduce((sum, row) => sum + row.returningCustomers, 0);

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${chartRows.length} periods with ${newCount} new customers and ${returningCount} returning customers.`,
    };
  }

  async runCustomerCohortAnalysis(
    workspaceId: string,
    filters: ReportFiltersByKey['customer-cohort-analysis'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.getOrdersForCustomerReports(workspaceId, filters);
    if (orders.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        summary: `No cohort data found in ${filters.dateRange} (${filters.cohortBy} cohorts).`,
      };
    }

    const uniquePeriods = Array.from(
      new Set(orders.map((order) => this.normalizeToPeriodStart(order.orderedAt, filters.cohortBy).toISOString())),
    )
      .map((periodIso) => new Date(periodIso))
      .sort((a, b) => a.getTime() - b.getTime());
    const periodIndexByKey = new Map(uniquePeriods.map((period, index) => [period.toISOString(), index]));

    const perCustomerPeriods = new Map<string, Set<number>>();
    for (const order of orders) {
      const periodKey = this.normalizeToPeriodStart(order.orderedAt, filters.cohortBy).toISOString();
      const periodIndex = periodIndexByKey.get(periodKey);
      if (periodIndex === undefined) {
        continue;
      }
      const existing = perCustomerPeriods.get(order.customerId) ?? new Set<number>();
      existing.add(periodIndex);
      perCustomerPeriods.set(order.customerId, existing);
    }

    const cohortMap = new Map<number, Array<Set<string>>>();
    for (const [customerId, activePeriods] of perCustomerPeriods) {
      const firstActivePeriod = Math.min(...Array.from(activePeriods.values()));
      if (!Number.isFinite(firstActivePeriod)) {
        continue;
      }

      const existing = cohortMap.get(firstActivePeriod) ?? [];
      for (const period of activePeriods) {
        const offset = period - firstActivePeriod;
        if (offset < 0 || offset >= filters.maxPeriods) {
          continue;
        }
        const customersAtOffset = existing[offset] ?? new Set<string>();
        customersAtOffset.add(customerId);
        existing[offset] = customersAtOffset;
      }
      cohortMap.set(firstActivePeriod, existing);
    }

    const chartRows = Array.from(cohortMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([cohortIndex, offsets]) => {
        const cohortPeriod = uniquePeriods[cohortIndex];
        const cohortSize = offsets[0]?.size ?? 0;
        const row: Record<string, string | number> = {
          cohortPeriodStart: cohortPeriod.toISOString(),
          cohortLabel: this.formatPeriodLabel(cohortPeriod, filters.cohortBy),
          cohortSize,
        };
        for (let offset = 0; offset < filters.maxPeriods; offset += 1) {
          const retained = offsets[offset]?.size ?? 0;
          const retentionRate = cohortSize > 0 ? Number(((retained / cohortSize) * 100).toFixed(2)) : 0;
          row[`p${offset}Customers`] = retained;
          row[`p${offset}RetentionRate`] = retentionRate;
        }
        return row;
      });

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${chartRows.length} cohorts computed (${filters.cohortBy}) with a ${filters.maxPeriods}-period retention matrix.`,
    };
  }

  async runRfmCustomerAnalysis(
    workspaceId: string,
    filters: ReportFiltersByKey['rfm-customer-analysis'],
  ): Promise<ReportComputationOutput> {
    const scores = await this.computeRfmScores(workspaceId, filters);
    if (scores.length === 0) {
      return {
        rows: 0,
        chartRows: [],
        summary: `No customers found for RFM analysis in ${filters.dateRange}.`,
      };
    }

    const aggregateBySegment = new Map<string, { customers: number; totalSpend: number }>();
    for (const score of scores) {
      const segment = this.deriveRfmSegment(score);
      const existing = aggregateBySegment.get(segment) ?? { customers: 0, totalSpend: 0 };
      existing.customers += 1;
      existing.totalSpend += score.monetary;
      aggregateBySegment.set(segment, existing);
    }

    const chartRows = Array.from(aggregateBySegment.entries())
      .sort((a, b) => b[1].customers - a[1].customers || a[0].localeCompare(b[0]))
      .map(([segment, values]) => ({
        segment,
        customers: values.customers,
        averageSpend: Number((values.totalSpend / values.customers).toFixed(2)),
      }));

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${scores.length} customers scored into ${chartRows.length} RFM segments using deterministic quintile buckets.`,
    };
  }

  async runRfmCustomerList(
    workspaceId: string,
    filters: ReportFiltersByKey['rfm-customer-list'],
  ): Promise<ReportComputationOutput> {
    const scores = await this.computeRfmScores(workspaceId, filters);
    const ordered = scores
      .sort((a, b) => b.rfmScore - a.rfmScore || b.monetary - a.monetary || a.customerId.localeCompare(b.customerId))
      .slice(0, filters.limit);

    const chartRows = ordered.map((item) => ({
      customerId: item.customerId,
      recencyDays: item.recencyDays,
      frequency: item.frequency,
      monetary: Number(item.monetary.toFixed(2)),
      recencyScore: item.recencyScore,
      frequencyScore: item.frequencyScore,
      monetaryScore: item.monetaryScore,
      rfmScore: item.rfmScore,
      segment: this.deriveRfmSegment(item),
    }));

    return {
      rows: chartRows.length,
      chartRows,
      summary: `${chartRows.length} customers returned with deterministic RFM scoring.`,
    };
  }

  private async computeRfmScores(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
    },
  ) {
    const orders = await this.getOrdersForCustomerReports(workspaceId, filters);
    const perCustomer = new Map<
      string,
      { latestOrderAt: Date; frequency: number; monetary: number }
    >();
    for (const order of orders) {
      const existing = perCustomer.get(order.customerId) ?? {
        latestOrderAt: order.orderedAt,
        frequency: 0,
        monetary: 0,
      };
      if (order.orderedAt.getTime() > existing.latestOrderAt.getTime()) {
        existing.latestOrderAt = order.orderedAt;
      }
      existing.frequency += 1;
      existing.monetary += order.total;
      perCustomer.set(order.customerId, existing);
    }

    const nowMs = Date.now();
    const values = Array.from(perCustomer.entries()).map(([customerId, agg]) => ({
      customerId,
      recencyDays: Math.max(0, Math.floor((nowMs - agg.latestOrderAt.getTime()) / (24 * 60 * 60 * 1000))),
      frequency: agg.frequency,
      monetary: agg.monetary,
    }));

    const recencyScores = this.assignDeterministicScores(values, (item) => item.recencyDays, true);
    const frequencyScores = this.assignDeterministicScores(values, (item) => item.frequency, false);
    const monetaryScores = this.assignDeterministicScores(values, (item) => item.monetary, false);

    return values.map((item) => {
      const recencyScore = recencyScores.get(item.customerId) ?? 1;
      const frequencyScore = frequencyScores.get(item.customerId) ?? 1;
      const monetaryScore = monetaryScores.get(item.customerId) ?? 1;
      return {
        ...item,
        recencyScore,
        frequencyScore,
        monetaryScore,
        rfmScore: recencyScore + frequencyScore + monetaryScore,
      };
    });
  }

  private async getFirstOrderDateByCustomer(workspaceId: string): Promise<Map<string, Date>> {
    const rows = await ((this.prisma as any).order as any).findMany({
      where: {
        workspaceId,
        customerId: { not: null },
      },
      select: {
        customerId: true,
        orderedAt: true,
        createdAt: true,
      },
      orderBy: [{ customerId: 'asc' }, { orderedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const firstOrderByCustomer = new Map<string, Date>();
    for (const row of rows as Array<{ customerId?: string | null; orderedAt?: Date | null; createdAt: Date }>) {
      if (!row.customerId) {
        continue;
      }
      const orderedAt = row.orderedAt ?? row.createdAt;
      if (!firstOrderByCustomer.has(row.customerId)) {
        firstOrderByCustomer.set(row.customerId, orderedAt);
      }
    }
    return firstOrderByCustomer;
  }

  private async getOrdersForCustomerReports(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
    },
  ): Promise<CustomerOrderPoint[]> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await ((this.prisma as any).order as any).findMany({
      where,
      select: {
        customerId: true,
        orderedAt: true,
        createdAt: true,
        total: true,
      },
    });

    return (orders as Array<{ customerId?: string | null; orderedAt?: Date | null; createdAt: Date; total: unknown }>)
      .filter((order) => !!order.customerId)
      .map((order) => ({
        customerId: order.customerId as string,
        orderedAt: order.orderedAt ?? order.createdAt,
        total: Number(order.total),
      }));
  }

  private buildOrderWhereInput(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
    },
  ) {
    const start = this.getDateRangeStart(filters.dateRange);
    const where: {
      workspaceId: string;
      customerId: { not: null };
      OR: Array<{ orderedAt: { gte: Date } } | { orderedAt: null; createdAt: { gte: Date } }>;
      channel?: { in: string[] };
      shipCountryCode?: { in: string[] };
    } = {
      workspaceId,
      customerId: { not: null },
      OR: [{ orderedAt: { gte: start } }, { orderedAt: null, createdAt: { gte: start } }],
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

    return where;
  }

  private assignDeterministicScores<T extends { customerId: string }>(
    items: T[],
    valueSelector: (item: T) => number,
    ascending: boolean,
  ): Map<string, number> {
    const sorted = [...items].sort((a, b) => {
      const left = valueSelector(a);
      const right = valueSelector(b);
      if (left === right) {
        return a.customerId.localeCompare(b.customerId);
      }
      return ascending ? left - right : right - left;
    });

    const total = sorted.length;
    const scoreByCustomer = new Map<string, number>();
    for (let index = 0; index < sorted.length; index += 1) {
      const rank = index + 1;
      const quintile = Math.ceil((rank / total) * 5);
      const score = Math.max(1, Math.min(5, 6 - quintile));
      scoreByCustomer.set(sorted[index].customerId, score);
    }
    return scoreByCustomer;
  }

  private deriveRfmSegment(score: {
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
  }): string {
    if (score.recencyScore >= 4 && score.frequencyScore >= 4 && score.monetaryScore >= 4) {
      return 'champions';
    }
    if (score.recencyScore >= 4 && score.frequencyScore >= 3) {
      return 'loyal';
    }
    if (score.recencyScore >= 3 && score.monetaryScore >= 3) {
      return 'potential_loyalists';
    }
    if (score.recencyScore <= 2 && score.frequencyScore <= 2 && score.monetaryScore <= 2) {
      return 'at_risk';
    }
    return 'needs_attention';
  }

  private getDateRangeStart(dateRange: DateRangePreset): Date {
    const now = new Date();
    const daysBackByRange: Record<DateRangePreset, number> = {
      last_7_days: 7,
      last_14_days: 14,
      last_30_days: 30,
      last_90_days: 90,
    };
    return new Date(now.getTime() - daysBackByRange[dateRange] * 24 * 60 * 60 * 1000);
  }

  private normalizeToPeriodStart(value: Date, groupBy: TimeGroupingOption | 'week' | 'month'): Date {
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

  private formatPeriodLabel(value: Date, groupBy: TimeGroupingOption | 'week' | 'month'): string {
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
