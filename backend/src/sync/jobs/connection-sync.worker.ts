import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionPlatform, Prisma } from '../../generated/prisma';

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}


type HistoricalOrderPayload = {
  id?: string | number;
  order_id?: string | number;
  orderId?: string | number;
  financial_status?: string;
  status?: string;
  order_number?: string;
  number?: string;
  name?: string;
  created_at?: string;
  ordered_at?: string;
  orderedAt?: string;
  currency?: string;
  subtotal_price?: string | number;
  subtotal?: string | number;
  total_tax?: string | number;
  tax?: string | number;
  total_shipping_price_set?: { shop_money?: { amount?: string | number } };
  shipping_price?: string | number;
  shipping?: string | number;
  total_price?: string | number;
  total?: string | number;
  fulfillment_timeline?: Array<Record<string, unknown>>;
  fulfillment_events?: Array<Record<string, unknown>>;
  shipping_labels?: Array<Record<string, unknown>>;
  shipping_label_purchases?: Array<Record<string, unknown>>;
  customer?: {
    id?: string | number;
    email?: string;
  };
  customer_id?: string | number;
  customerId?: string | number;
  email?: string;
};

@Processor('sync') // queue name (no colons)
export class ConnectionSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ConnectionSyncWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toDecimal(value: unknown): Prisma.Decimal {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Prisma.Decimal(String(value));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return new Prisma.Decimal(value.trim());
    }

    return new Prisma.Decimal('0');
  }

  private asDate(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeFulfillmentStatus(value: unknown): 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED' | null {
    const normalized = this.asNonEmptyString(value)?.toLowerCase();
    if (!normalized) return null;
    if (normalized === 'placed' || normalized === 'created') return 'PLACED';
    if (normalized === 'fulfilled' || normalized === 'picked') return 'FULFILLED';
    if (normalized === 'shipped' || normalized === 'in_transit' || normalized === 'in-transit') return 'SHIPPED';
    if (normalized === 'delivered') return 'DELIVERED';
    return null;
  }

  private normalizeExternalIdentifier(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  }

  private normalizeEmailCanonical(value: unknown): string | null {
    const email = this.asNonEmptyString(value);
    return email ? email.toLowerCase() : null;
  }

  private async resolveCustomerId(args: {
    workspaceId: string;
    payload: HistoricalOrderPayload;
  }): Promise<string | null> {
    const externalId =
      this.normalizeExternalIdentifier(args.payload.customer?.id) ??
      this.normalizeExternalIdentifier(args.payload.customer_id) ??
      this.normalizeExternalIdentifier(args.payload.customerId);
    const emailCanonical =
      this.normalizeEmailCanonical(args.payload.customer?.email) ?? this.normalizeEmailCanonical(args.payload.email);

    if (!externalId && !emailCanonical) {
      return null;
    }

    if (externalId) {
      const customer = await ((this.prisma as any).customer as any).upsert({
        where: {
          workspaceId_externalId: {
            workspaceId: args.workspaceId,
            externalId,
          },
        },
        update: emailCanonical ? { emailCanonical } : {},
        create: {
          workspaceId: args.workspaceId,
          externalId,
          emailCanonical,
        },
        select: {
          id: true,
        },
      });
      return customer.id;
    }

    const customer = await ((this.prisma as any).customer as any).upsert({
      where: {
        workspaceId_emailCanonical: {
          workspaceId: args.workspaceId,
          emailCanonical,
        },
      },
      update: {},
      create: {
        workspaceId: args.workspaceId,
        emailCanonical,
      },
      select: {
        id: true,
      },
    });
    return customer.id;
  }

  private async createDataAvailabilityMarker(args: {
    workspaceId: string;
    platform: ConnectionPlatform;
    externalEventId: string;
    topic: string;
    payload: unknown;
  }): Promise<boolean> {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          workspaceId: args.workspaceId,
          platform: args.platform,
          externalEventId: args.externalEventId,
          topic: args.topic,
          payload: args.payload as Prisma.InputJsonValue,
          headers: { source: 'sync-worker' },
          receivedAt: new Date(),
          processedAt: new Date(),
        },
      });
      return true;
    } catch (err: any) {
      if (typeof err?.code === 'string' && err.code === 'P2002') return false;
      throw err;
    }
  }

  private async ingestHistoricalOrder(args: {
    workspaceId: string;
    platform: ConnectionPlatform;
    payload: HistoricalOrderPayload;
  }) {
    const { workspaceId, platform, payload } = args;
    const orderExternalRef =
      this.normalizeExternalIdentifier(payload.id) ??
      this.normalizeExternalIdentifier(payload.order_id) ??
      this.normalizeExternalIdentifier(payload.orderId);
    if (!orderExternalRef) return;

    const status = this.asNonEmptyString(payload.financial_status ?? payload.status);
    if (!status) return;

    const orderedAt = this.asDate(payload.created_at ?? payload.ordered_at ?? payload.orderedAt);
    const currency = this.asNonEmptyString(payload.currency) ?? 'USD';
    const customerId = await this.resolveCustomerId({ workspaceId, payload });

    const order = await (this.prisma.order as any).upsert({
      where: {
        workspaceId_externalRef: {
          workspaceId,
          externalRef: orderExternalRef,
        },
      },
      update: {
        orderNumber: this.asNonEmptyString(payload.order_number ?? payload.number ?? payload.name),
        status,
        channel: platform.toLowerCase(),
        customerId,
        orderedAt,
        currency,
        subtotal: this.toDecimal(payload.subtotal_price ?? payload.subtotal ?? 0),
        tax: this.toDecimal(payload.total_tax ?? payload.tax ?? 0),
        shipping: this.toDecimal(
          payload.total_shipping_price_set?.shop_money?.amount ?? payload.shipping_price ?? payload.shipping ?? 0,
        ),
        total: this.toDecimal(payload.total_price ?? payload.total ?? 0),
      },
      create: {
        workspaceId,
        externalRef: orderExternalRef,
        orderNumber: this.asNonEmptyString(payload.order_number ?? payload.number ?? payload.name),
        status,
        channel: platform.toLowerCase(),
        customerId,
        orderedAt,
        currency,
        subtotal: this.toDecimal(payload.subtotal_price ?? payload.subtotal ?? 0),
        tax: this.toDecimal(payload.total_tax ?? payload.tax ?? 0),
        shipping: this.toDecimal(
          payload.total_shipping_price_set?.shop_money?.amount ?? payload.shipping_price ?? payload.shipping ?? 0,
        ),
        total: this.toDecimal(payload.total_price ?? payload.total ?? 0),
      },
      select: {
        id: true,
      },
    });

    const fulfillmentEvents = Array.isArray(payload.fulfillment_timeline)
      ? payload.fulfillment_timeline
      : Array.isArray(payload.fulfillment_events)
      ? payload.fulfillment_events
      : [];

    for (const event of fulfillmentEvents) {
      const eventAt = this.asDate(event?.event_at ?? event?.happened_at ?? event?.created_at);
      const mappedStatus = this.normalizeFulfillmentStatus(event?.status ?? event?.name ?? event?.state);
      if (!eventAt || !mappedStatus) continue;

      const eventExternalId =
        this.normalizeExternalIdentifier(event?.id) ??
        this.normalizeExternalIdentifier(event?.event_id) ??
        `${mappedStatus}:${eventAt.toISOString()}`;

      const markerId = `sync:${orderExternalRef}:fulfillment_timeline:${eventExternalId}`;
      const shouldCreate = await this.createDataAvailabilityMarker({
        workspaceId,
        platform,
        externalEventId: markerId,
        topic: 'sync:historical:fulfillment_timeline',
        payload: event,
      });

      if (!shouldCreate) continue;

      await ((this.prisma as any).orderFulfillmentStatusEvent).create({
        data: {
          workspaceId,
          orderId: order.id,
          status: mappedStatus,
          eventAt,
        },
      });
    }

    const labelPayloads = Array.isArray(payload.shipping_labels)
      ? payload.shipping_labels
      : Array.isArray(payload.shipping_label_purchases)
      ? payload.shipping_label_purchases
      : [];

    for (const label of labelPayloads) {
      const purchasedAt = this.asDate(label?.purchased_at ?? label?.created_at ?? label?.label_created_at);
      if (!purchasedAt) continue;

      const carrier = this.asNonEmptyString(label?.carrier ?? label?.tracking_company) ?? 'unknown';
      const service = this.asNonEmptyString(label?.service ?? label?.shipping_service) ?? 'unknown';
      const packageType = this.asNonEmptyString(label?.package_type ?? label?.packageType ?? label?.package) ?? 'unknown';
      const labelExternalId =
        this.normalizeExternalIdentifier(label?.id) ??
        this.normalizeExternalIdentifier(label?.label_id) ??
        `${carrier}:${service}:${purchasedAt.toISOString()}`;

      const markerId = `sync:${orderExternalRef}:shipping_label_purchase:${labelExternalId}`;
      const shouldCreate = await this.createDataAvailabilityMarker({
        workspaceId,
        platform,
        externalEventId: markerId,
        topic: 'sync:historical:shipping_label_purchase',
        payload: label,
      });

      if (!shouldCreate) continue;

      await ((this.prisma as any).orderShippingLabelPurchase).create({
        data: {
          workspaceId,
          orderId: order.id,
          carrier,
          service,
          packageType,
          labelCost: this.toDecimal(label?.label_cost ?? label?.cost ?? 0),
          customerPaidCost: this.toDecimal(label?.customer_paid_cost ?? label?.customer_paid ?? label?.price ?? 0),
          currency: this.asNonEmptyString(label?.currency ?? payload.currency) ?? 'USD',
          purchasedAt,
        },
      });
    }
  }


  private async upsertInventorySnapshotForDay(args: {
    workspaceId: string;
    dayUtc: Date;
    snapshotAt: Date;
  }): Promise<void> {
    const day = startOfUtcDay(args.dayUtc);

    const inventoryRows = await (this.prisma.inventory.findMany as any)({
      where: { workspaceId: args.workspaceId },
      select: {
        locationId: true,
        productId: true,
        onHand: true,
        reserved: true,
      },
    });

    if (inventoryRows.length === 0) {
      this.logger.log(
        `No inventory rows to snapshot at sync completion: workspaceId=${args.workspaceId} day=${day.toISOString()}`,
      );
      return;
    }

    await this.prisma.$transaction(
      inventoryRows.map((row: any) =>
        (this.prisma as any).inventorySnapshot.upsert({
          where: {
            workspaceId_locationId_productId_day: {
              workspaceId: args.workspaceId,
              locationId: row.locationId,
              productId: row.productId,
              day,
            },
          },
          update: {
            onHand: row.onHand,
            reserved: row.reserved ?? 0,
            available: row.onHand - (row.reserved ?? 0),
            snapshotAt: args.snapshotAt,
          },
          create: {
            workspaceId: args.workspaceId,
            locationId: row.locationId,
            productId: row.productId,
            day,
            snapshotAt: args.snapshotAt,
            onHand: row.onHand,
            reserved: row.reserved ?? 0,
            available: row.onHand - (row.reserved ?? 0),
          },
        }),
      ),
    );

    this.logger.log(
      `InventorySnapshot upserted at sync completion: workspaceId=${args.workspaceId} day=${day.toISOString()} rows=${inventoryRows.length}`,
    );
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'sync:run_connection') return;

    const { workspaceId, connectionId, syncRunId, historicalOrders } = job.data as {
      workspaceId: string;
      connectionId: string;
      syncRunId: string;
      idempotencyKey?: string;
      historicalOrders?: HistoricalOrderPayload[];
    };

    if (!workspaceId || !connectionId || !syncRunId) {
      throw new Error(
        'Invalid job payload: workspaceId, connectionId, syncRunId are required',
      );
    }

    // Ensure workspace scoping
    const run = await this.prisma.syncRun.findFirst({
      where: { id: syncRunId, workspaceId, connectionId },
      select: { id: true },
    });

    if (!run) {
      throw new Error('SyncRun not found for this workspace/connection');
    }

    const connection = await this.prisma.connection.findFirst({
      where: { id: connectionId, workspaceId },
      select: { id: true, platform: true },
    });

    if (!connection) {
      throw new Error('Connection not found for this workspace');
    }

    const startedAt = new Date();

    try {
      this.logger.log(
        `Starting sync run=${syncRunId} workspace=${workspaceId} connection=${connectionId}`,
      );

      await this.prisma.syncRun.update({
        where: { id: syncRunId, workspaceId },
        data: {
          status: 'RUNNING',
          startedAt,
          error: null,
        },
      });

      const supportsHistoricalFulfillmentSync = connection.platform === 'SHOPIFY';
      if (supportsHistoricalFulfillmentSync && Array.isArray(historicalOrders)) {
        for (const historicalOrder of historicalOrders) {
          await this.ingestHistoricalOrder({
            workspaceId,
            platform: connection.platform,
            payload: historicalOrder,
          });
        }
      }

      const finishedAt = new Date();

      await this.upsertInventorySnapshotForDay({
        workspaceId,
        dayUtc: finishedAt,
        snapshotAt: finishedAt,
      });

      await this.prisma.syncRun.update({
        where: { id: syncRunId, workspaceId },
        data: {
          status: 'SUCCESS',
          finishedAt,
        },
      });

      await this.prisma.connection.update({
        where: { id: connectionId, workspaceId },
        data: {
          lastSyncAt: finishedAt,
          lastError: null,
        },
      });

      this.logger.log(
        `Completed sync run=${syncRunId} workspace=${workspaceId} connection=${connectionId}`,
      );
    } catch (err: any) {
      const finishedAt = new Date();
      const message =
        typeof err?.message === 'string'
          ? err.message.slice(0, 2000)
          : 'Sync failed';

      await this.prisma.syncRun.update({
        where: { id: syncRunId, workspaceId },
        data: {
          status: 'FAILED',
          finishedAt,
          error: message,
        },
      });

      await this.prisma.connection.update({
        where: { id: connectionId, workspaceId },
        data: {
          lastError: message,
        },
      });

      this.logger.error(
        `Sync failed run=${syncRunId} workspace=${workspaceId} connection=${connectionId} error=${message}`,
      );

      throw err;
    }
  }
}
