import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type DateRangePreset,
  type OrderStatusOption,
  type RegionOption,
  type ReportComputationOutput,
  type ReportFiltersByKey,
  type ReportPlatform,
} from '../../orders/reporting/orders-reports.service';

type ShippingOrderRecord = {
  id: string;
  orderNumber: string | null;
  orderedAt: Date | null;
  createdAt: Date;
  fulfillmentStatusEvents: Array<{ status: 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED'; eventAt: Date }>;
  shippingLabelPurchases: Array<{ carrier: string; service: string; purchasedAt: Date }>;
  items: Array<{ location: { code: string } | null }>;
};

@Injectable()
export class FulfillmentReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async runOrderFulfillmentHealth(filters: ReportFiltersByKey['order-fulfillment-health']): Promise<ReportComputationOutput> {
    return {
      rows: 0,
      chartRows: [],
      summary: `Order Fulfillment Health is not currently implemented for ${filters.dateRange}.`,
    };
  }

  async runShippingDeliveryPerformance(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-delivery-performance'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const durations = scoped
      .map((order) => this.buildTimelineDurations(order))
      .filter((row) => row.fulfilledToDeliveredHours !== null || row.shippedToDeliveredHours !== null);

    const chartRows = [
      {
        metric: 'fulfilled_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.fulfilledToDeliveredHours)),
        sampleSize: durations.filter((row) => row.fulfilledToDeliveredHours !== null).length,
      },
      {
        metric: 'shipped_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.shippedToDeliveredHours)),
        sampleSize: durations.filter((row) => row.shippedToDeliveredHours !== null).length,
      },
      {
        metric: 'ordered_to_delivered_hours',
        medianHours: this.median(durations.map((row) => row.orderedToDeliveredHours)),
        sampleSize: durations.filter((row) => row.orderedToDeliveredHours !== null).length,
      },
    ];

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${scoped.length} shipping orders analyzed with median delivery timeline deltas in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  async runOrdersFulfilledOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['orders-fulfilled-over-time'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);

    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const fulfilledOrders = scoped
      .map((order) => ({
        ...order,
        fulfillmentStatusEvents: order.fulfillmentStatusEvents.filter((event) => event.status === 'FULFILLED'),
      }))
      .filter((order) => order.fulfillmentStatusEvents.length > 0);
    const buckets = new Map<string, { periodStart: Date; fulfillmentDurations: number[]; fulfilledCount: number }>();
    for (const order of fulfilledOrders) {
      const fulfilledAt = order.fulfillmentStatusEvents[0]?.eventAt ?? null;
      if (!fulfilledAt) {
        continue;
      }
      const periodStart = this.normalizeToPeriodStart(fulfilledAt);
      const key = periodStart.toISOString();
      const bucket = buckets.get(key) ?? { periodStart, fulfillmentDurations: [], fulfilledCount: 0 };
      bucket.fulfilledCount += 1;
      const baseline = order.orderedAt ?? order.createdAt ?? null;
      const duration = this.diffHoursNullable(baseline, fulfilledAt);
      if (duration !== null) {
        bucket.fulfillmentDurations.push(duration);
      }
      buckets.set(key, bucket);
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: bucket.periodStart.toISOString().slice(0, 10),
        fulfilledOrders: bucket.fulfilledCount,
        medianOrderToFulfilledHours: this.median(bucket.fulfillmentDurations),
      }));

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${fulfilledOrders.length} fulfilled orders grouped into ${chartRows.length} daily buckets in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  async runShippingLabelsOverTime(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-labels-over-time'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);
    const buckets = new Map<string, { periodStart: Date; labels: number; leadTimes: number[] }>();

    for (const order of scoped) {
      const baseline = order.orderedAt ?? order.createdAt ?? null;
      for (const label of order.shippingLabelPurchases) {
        const periodStart = this.normalizeToPeriodStart(label.purchasedAt);
        const key = periodStart.toISOString();
        const bucket = buckets.get(key) ?? { periodStart, labels: 0, leadTimes: [] };
        bucket.labels += 1;
        const leadHours = this.diffHoursNullable(baseline, label.purchasedAt);
        if (leadHours !== null) {
          bucket.leadTimes.push(leadHours);
        }
        buckets.set(key, bucket);
      }
    }

    const chartRows = Array.from(buckets.values())
      .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
      .map((bucket) => ({
        periodStart: bucket.periodStart.toISOString(),
        periodLabel: bucket.periodStart.toISOString().slice(0, 10),
        labelsPurchased: bucket.labels,
        medianOrderToLabelHours: this.median(bucket.leadTimes),
      }));

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${chartRows.reduce((sum, row) => sum + (typeof row.labelsPurchased === 'number' ? row.labelsPurchased : 0), 0)} labels across ${chartRows.length} daily buckets in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  async runShippingLabelsByOrder(
    workspaceId: string,
    filters: ReportFiltersByKey['shipping-labels-by-order'],
  ): Promise<ReportComputationOutput> {
    const orders = await this.loadShippingOrders(workspaceId, filters);
    const warnings = this.buildShippingWarnings(orders);
    const scoped = this.applyShippingDimensionFilters(orders, filters);

    const chartRows = scoped
      .filter((order) => order.shippingLabelPurchases.length > 0)
      .map((order) => {
        const carriers = this.uniqueNonEmpty(order.shippingLabelPurchases.map((label) => label.carrier));
        const services = this.uniqueNonEmpty(order.shippingLabelPurchases.map((label) => label.service));
        const locations = this.uniqueNonEmpty(order.items.map((item) => item.location?.code ?? null));
        return {
          orderId: order.id,
          orderNumber: order.orderNumber ?? null,
          labelsPurchased: order.shippingLabelPurchases.length,
          carrier: carriers.length === 0 ? null : carriers.join(','),
          service: services.length === 0 ? null : services.join(','),
          location: locations.length === 0 ? null : locations.join(','),
          firstLabelPurchasedAt: order.shippingLabelPurchases
            .map((label) => label.purchasedAt)
            .sort((a, b) => a.getTime() - b.getTime())[0]
            ?.toISOString() ?? null,
        };
      });

    return {
      rows: chartRows.length,
      chartRows,
      warnings,
      summary: `${chartRows.length} orders with shipping label purchases in ${filters.dateRange}.`,
      caveat: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  private async loadShippingOrders(
    workspaceId: string,
    filters: {
      platform: ReportPlatform[];
      dateRange: DateRangePreset;
      region: RegionOption;
      statuses?: OrderStatusOption[];
    },
  ): Promise<ShippingOrderRecord[]> {
    const where = this.buildOrderWhereInput(workspaceId, filters);
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        orderedAt: true,
        createdAt: true,
      },
    });

    if (orders.length === 0) {
      return [];
    }

    const orderIds = new Set(orders.map((order) => order.id));
    const [events, labels, orderItems] = await Promise.all([
      this.prisma.$queryRaw<Array<{ orderId: string; status: string; eventAt: Date }>>`
        SELECT "orderId", "status", "eventAt"
        FROM "OrderFulfillmentStatusEvent"
        WHERE "workspaceId" = ${workspaceId}
      `,
      this.prisma.$queryRaw<Array<{ orderId: string; carrier: string; service: string; purchasedAt: Date }>>`
        SELECT "orderId", "carrier", "service", "purchasedAt"
        FROM "OrderShippingLabelPurchase"
        WHERE "workspaceId" = ${workspaceId}
      `,
      this.prisma.orderItem.findMany({
        where: { orderId: { in: Array.from(orderIds) } },
        select: {
          orderId: true,
          location: { select: { code: true } },
        },
      }),
    ]);

    const eventsByOrder = new Map<string, ShippingOrderRecord['fulfillmentStatusEvents']>();
    for (const event of events) {
      if (!orderIds.has(event.orderId)) {
        continue;
      }
      const existing = eventsByOrder.get(event.orderId) ?? [];
      if (
        event.status === 'PLACED' ||
        event.status === 'FULFILLED' ||
        event.status === 'SHIPPED' ||
        event.status === 'DELIVERED'
      ) {
        existing.push({ status: event.status, eventAt: event.eventAt });
      }
      eventsByOrder.set(event.orderId, existing.sort((a, b) => a.eventAt.getTime() - b.eventAt.getTime()));
    }

    const labelsByOrder = new Map<string, ShippingOrderRecord['shippingLabelPurchases']>();
    for (const label of labels) {
      if (!orderIds.has(label.orderId)) {
        continue;
      }
      const existing = labelsByOrder.get(label.orderId) ?? [];
      existing.push(label);
      labelsByOrder.set(label.orderId, existing.sort((a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime()));
    }

    const locationsByOrder = new Map<string, ShippingOrderRecord['items']>();
    for (const item of orderItems) {
      const existing = locationsByOrder.get(item.orderId) ?? [];
      existing.push({ location: item.location?.code ? { code: item.location.code } : null });
      locationsByOrder.set(item.orderId, existing);
    }

    return orders.map((order) => ({
      ...order,
      fulfillmentStatusEvents: eventsByOrder.get(order.id) ?? [],
      shippingLabelPurchases: labelsByOrder.get(order.id) ?? [],
      items: locationsByOrder.get(order.id) ?? [],
    }));
  }

  private applyShippingDimensionFilters<T extends {
    shippingLabelPurchases: Array<{ carrier: string; service: string; purchasedAt: Date }>;
    items: Array<{ location: { code: string } | null }>;
  }>(
    orders: T[],
    filters: { carrierQuery: string; serviceQuery: string; locationQuery: string },
  ): T[] {
    const carrierQuery = filters.carrierQuery.trim().toLowerCase();
    const serviceQuery = filters.serviceQuery.trim().toLowerCase();
    const locationQuery = filters.locationQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const carrierMatch =
        carrierQuery.length === 0 ||
        order.shippingLabelPurchases.some((label) => label.carrier.toLowerCase().includes(carrierQuery));
      const serviceMatch =
        serviceQuery.length === 0 ||
        order.shippingLabelPurchases.some((label) => label.service.toLowerCase().includes(serviceQuery));
      const locationMatch =
        locationQuery.length === 0 ||
        order.items.some((item) => (item.location?.code ?? '').toLowerCase().includes(locationQuery));
      return carrierMatch && serviceMatch && locationMatch;
    });
  }

  private buildShippingWarnings(
    orders: Array<{
      fulfillmentStatusEvents?: Array<{ eventAt: Date }>;
      shippingLabelPurchases: Array<{ purchasedAt: Date }>;
      items: Array<{ location: { code: string } | null }>;
    }>,
  ): string[] {
    const warnings: string[] = [];
    if (orders.length === 0) {
      warnings.push('Warning: No orders were found for the selected workspace and date range.');
      return warnings;
    }
    const totalEvents = orders.reduce((sum, order) => sum + (order.fulfillmentStatusEvents?.length ?? 0), 0);
    const totalLabels = orders.reduce((sum, order) => sum + order.shippingLabelPurchases.length, 0);
    const ordersWithLocation = orders.filter((order) => order.items.some((item) => item.location?.code)).length;

    if (totalEvents === 0) {
      warnings.push('Warning: Workspace has no fulfillment status events required for shipping timeline metrics.');
    }
    if (totalLabels === 0) {
      warnings.push('Warning: Workspace has no shipping label purchases required for shipping reports.');
    }
    if (ordersWithLocation === 0) {
      warnings.push('Warning: Workspace has no order-item locations; location filters will return no matches.');
    }

    return warnings;
  }

  private buildTimelineDurations(order: {
    orderedAt: Date | null;
    createdAt: Date;
    fulfillmentStatusEvents: Array<{ status: 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED'; eventAt: Date }>;
  }) {
    const firstFulfilled = order.fulfillmentStatusEvents.find((event) => event.status === 'FULFILLED')?.eventAt ?? null;
    const firstShipped = order.fulfillmentStatusEvents.find((event) => event.status === 'SHIPPED')?.eventAt ?? null;
    const firstDelivered = order.fulfillmentStatusEvents.find((event) => event.status === 'DELIVERED')?.eventAt ?? null;
    const baseline = order.orderedAt ?? order.createdAt ?? null;

    return {
      fulfilledToDeliveredHours: this.diffHoursNullable(firstFulfilled, firstDelivered),
      shippedToDeliveredHours: this.diffHoursNullable(firstShipped, firstDelivered),
      orderedToDeliveredHours: this.diffHoursNullable(baseline, firstDelivered),
    };
  }

  private diffHoursNullable(start: Date | null, end: Date | null): number | null {
    if (!start || !end) {
      return null;
    }
    const millis = end.getTime() - start.getTime();
    if (!Number.isFinite(millis) || millis < 0) {
      return null;
    }
    return Number((millis / (1000 * 60 * 60)).toFixed(2));
  }

  private median(values: Array<number | null>): number | null {
    const sorted = values
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);
    if (sorted.length === 0) {
      return null;
    }
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return Number(sorted[mid].toFixed(2));
    }
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }

  private uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
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

  private normalizeToPeriodStart(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
}
