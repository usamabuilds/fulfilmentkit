import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionPlatform, Prisma } from '../../generated/prisma';

type IngestWebhookArgs = {
  workspaceId: string;
  platform: 'shopify' | 'woocommerce' | 'amazon';
  headers: any;
  payload: any;
};

type ParsedFulfillmentTimelineEvent = {
  externalEventId: string;
  status: 'PLACED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED';
  eventAt: Date;
};

type ParsedShippingLabelPurchase = {
  externalEventId: string;
  carrier: string;
  service: string;
  packageType: string;
  labelCost: Prisma.Decimal;
  customerPaidCost: Prisma.Decimal;
  currency: string;
  purchasedAt: Date;
};

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  private toPlatformEnum(platform: 'shopify' | 'woocommerce' | 'amazon'): ConnectionPlatform {
    if (platform === 'shopify') return 'SHOPIFY';
    if (platform === 'woocommerce') return 'WOOCOMMERCE';
    return 'AMAZON';
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

  private asDate(value: unknown): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private extractShipCountryCode(payload: any): string | null {
    const countryCode = this.asNonEmptyString(
      payload?.shipping_address?.country_code ??
        payload?.shipping?.address?.countryCode ??
        payload?.shipping?.countryCode ??
        payload?.shipCountryCode ??
        payload?.shipping_country_code,
    );

    return countryCode ? countryCode.toUpperCase() : null;
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

  private getOrderExternalRef(payload: any): string | null {
    const externalRef = payload?.id ?? payload?.order_id ?? payload?.orderId;
    if (externalRef === null || externalRef === undefined) return null;

    const asString = String(externalRef).trim();
    return asString.length > 0 ? asString : null;
  }

  private async upsertOrderFromPayload(args: {
    workspaceId: string;
    platform: 'shopify' | 'woocommerce' | 'amazon';
    payload: any;
  }) {
    const { workspaceId, platform, payload } = args;

    const externalRef = this.getOrderExternalRef(payload);
    if (!externalRef) return null;

    const orderNumber = this.asNonEmptyString(
      payload?.order_number ?? payload?.number ?? payload?.name,
    );

    const status = this.asNonEmptyString(payload?.financial_status ?? payload?.status);

    if (!status) return null;

    const orderedAtRaw = payload?.created_at ?? payload?.ordered_at ?? payload?.orderedAt;
    const orderedAt = orderedAtRaw ? new Date(orderedAtRaw) : null;
    const validOrderedAt = orderedAt && Number.isNaN(orderedAt.getTime()) ? null : orderedAt;

    const currency = this.asNonEmptyString(payload?.currency) ?? 'USD';

    const subtotal = this.toDecimal(payload?.subtotal_price ?? payload?.subtotal ?? 0);
    const tax = this.toDecimal(payload?.total_tax ?? payload?.tax ?? 0);
    const shipping = this.toDecimal(
      payload?.total_shipping_price_set?.shop_money?.amount ??
        payload?.shipping_price ??
        payload?.shipping ??
        0,
    );

    const total = this.toDecimal(payload?.total_price ?? payload?.total ?? 0);

    return (this.prisma.order as any).upsert({
      where: {
        workspaceId_externalRef: {
          workspaceId,
          externalRef,
        },
      },
      update: {
        orderNumber,
        status,
        channel: platform,
        shipCountryCode: this.extractShipCountryCode(payload),
        orderedAt: validOrderedAt,
        currency,
        subtotal,
        tax,
        shipping,
        total,
      },
      create: {
        workspaceId,
        externalRef,
        orderNumber,
        status,
        channel: platform,
        shipCountryCode: this.extractShipCountryCode(payload),
        orderedAt: validOrderedAt,
        currency,
        subtotal,
        tax,
        shipping,
        total,
      },
      select: {
        id: true,
        externalRef: true,
      },
    });
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

  private parseFulfillmentTimelineEvents(payload: any): ParsedFulfillmentTimelineEvent[] {
    const rawEvents: any[] = Array.isArray(payload?.fulfillment_timeline)
      ? payload.fulfillment_timeline
      : Array.isArray(payload?.fulfillment_events)
      ? payload.fulfillment_events
      : Array.isArray(payload?.fulfillments)
      ? payload.fulfillments.flatMap((fulfillment: any) =>
          Array.isArray(fulfillment?.events) ? fulfillment.events : [fulfillment],
        )
      : [];

    const parsedEvents: ParsedFulfillmentTimelineEvent[] = [];

    for (const event of rawEvents) {
      const status = this.normalizeFulfillmentStatus(event?.status ?? event?.name ?? event?.state);
      const eventAt = this.asDate(event?.event_at ?? event?.happened_at ?? event?.created_at);
      if (!status || !eventAt) continue;

      const sourceEventId =
        this.normalizeExternalIdentifier(event?.id) ??
        this.normalizeExternalIdentifier(event?.event_id) ??
        `${status}:${eventAt.toISOString()}`;

      parsedEvents.push({
        externalEventId: sourceEventId,
        status,
        eventAt,
      });
    }

    return parsedEvents;
  }

  private parseShippingLabelPurchases(payload: any): ParsedShippingLabelPurchase[] {
    const labelPayloads: any[] = Array.isArray(payload?.shipping_labels)
      ? payload.shipping_labels
      : Array.isArray(payload?.shipping_label_purchases)
      ? payload.shipping_label_purchases
      : Array.isArray(payload?.fulfillments)
      ? payload.fulfillments
      : payload?.shipping_label || payload?.shippingLabel
      ? [payload.shipping_label ?? payload.shippingLabel]
      : [];

    const parsedLabels: ParsedShippingLabelPurchase[] = [];

    for (const label of labelPayloads) {
      const purchasedAt = this.asDate(
        label?.purchased_at ?? label?.created_at ?? label?.label_created_at,
      );
      if (!purchasedAt) continue;

      const carrier = this.asNonEmptyString(label?.carrier ?? label?.tracking_company) ?? 'unknown';
      const service = this.asNonEmptyString(label?.service ?? label?.shipping_service) ?? 'unknown';
      const packageType =
        this.asNonEmptyString(label?.package_type ?? label?.packageType ?? label?.package) ??
        'unknown';
      const currency = this.asNonEmptyString(label?.currency ?? payload?.currency) ?? 'USD';

      const sourceEventId =
        this.normalizeExternalIdentifier(label?.id) ??
        this.normalizeExternalIdentifier(label?.label_id) ??
        `${carrier}:${service}:${purchasedAt.toISOString()}`;

      parsedLabels.push({
        externalEventId: sourceEventId,
        carrier,
        service,
        packageType,
        labelCost: this.toDecimal(label?.label_cost ?? label?.cost ?? 0),
        customerPaidCost: this.toDecimal(
          label?.customer_paid_cost ?? label?.customer_paid ?? label?.price ?? 0,
        ),
        currency,
        purchasedAt,
      });
    }

    return parsedLabels;
  }

  private async storeDerivedIngestEvent(args: {
    workspaceId: string;
    platformEnum: ConnectionPlatform;
    parentExternalEventId: string;
    derivedType: 'fulfillment_timeline' | 'shipping_label_purchase';
    derivedExternalId: string;
    payload: any;
  }): Promise<boolean> {
    const {
      workspaceId,
      platformEnum,
      parentExternalEventId,
      derivedType,
      derivedExternalId,
      payload,
    } = args;

    const dedupeExternalId = `${parentExternalEventId}:${derivedType}:${derivedExternalId}`;

    try {
      await this.prisma.webhookEvent.create({
        data: {
          workspaceId,
          platform: platformEnum,
          externalEventId: dedupeExternalId,
          topic: `derived:${derivedType}`,
          payload,
          headers: {
            parentExternalEventId,
            derivedType,
            derivedExternalId,
          },
          processedAt: new Date(),
        },
      });

      return true;
    } catch (err: any) {
      if (typeof err?.code === 'string' && err.code === 'P2002') {
        return false;
      }

      throw err;
    }
  }

  private async persistFulfillmentAndShippingData(args: {
    workspaceId: string;
    platformEnum: ConnectionPlatform;
    parentExternalEventId: string;
    orderId: string;
    payload: any;
  }) {
    const { workspaceId, platformEnum, parentExternalEventId, orderId, payload } = args;

    const fulfillmentEvents = this.parseFulfillmentTimelineEvents(payload);
    for (const timelineEvent of fulfillmentEvents) {
      const shouldPersist = await this.storeDerivedIngestEvent({
        workspaceId,
        platformEnum,
        parentExternalEventId,
        derivedType: 'fulfillment_timeline',
        derivedExternalId: timelineEvent.externalEventId,
        payload: timelineEvent,
      });

      if (!shouldPersist) continue;

      await ((this.prisma as any).orderFulfillmentStatusEvent).create({
        data: {
          workspaceId,
          orderId,
          status: timelineEvent.status,
          eventAt: timelineEvent.eventAt,
        },
      });
    }

    const labelPurchases = this.parseShippingLabelPurchases(payload);
    for (const label of labelPurchases) {
      const shouldPersist = await this.storeDerivedIngestEvent({
        workspaceId,
        platformEnum,
        parentExternalEventId,
        derivedType: 'shipping_label_purchase',
        derivedExternalId: label.externalEventId,
        payload: label,
      });

      if (!shouldPersist) continue;

      await ((this.prisma as any).orderShippingLabelPurchase).create({
        data: {
          workspaceId,
          orderId,
          carrier: label.carrier,
          service: label.service,
          packageType: label.packageType,
          labelCost: label.labelCost,
          customerPaidCost: label.customerPaidCost,
          currency: label.currency,
          purchasedAt: label.purchasedAt,
        },
      });
    }
  }

  async ingestWebhook(args: IngestWebhookArgs) {
    const { workspaceId, platform, headers, payload } = args;

    const platformEnum = this.toPlatformEnum(platform);

    // IMPORTANT:
    // In real life, externalEventId must come from provider headers.
    // For v1 stub, we use header or fallback to payload.id.
    const externalEventId = headers['x-event-id'] || headers['x-shopify-webhook-id'] || payload?.id;

    if (!externalEventId) {
      throw new BadRequestException('Webhook missing external event id');
    }

    try {
      // 1️⃣ Store FIRST (dedupe enforced by unique constraint)
      const event = await this.prisma.webhookEvent.create({
        data: {
          workspaceId,
          platform: platformEnum,
          externalEventId: String(externalEventId),
          topic: headers['x-topic'] ?? null,
          payload,
          headers,
          receivedAt: new Date(),
        },
      });

      // 2️⃣ Process event
      const order = await this.upsertOrderFromPayload({ workspaceId, platform, payload });

      if (order?.id) {
        await this.persistFulfillmentAndShippingData({
          workspaceId,
          platformEnum,
          parentExternalEventId: String(externalEventId),
          orderId: order.id,
          payload,
        });
      }

      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          processedAt: new Date(),
          error: null,
        },
      });

      return {
        success: true,
        data: {
          stored: true,
          deduped: false,
        },
      };
    } catch (err: any) {
      // If unique constraint violation → duplicate webhook
      if (typeof err?.code === 'string' && err.code === 'P2002') {
        return {
          success: true,
          data: {
            stored: false,
            deduped: true,
          },
        };
      }

      throw err;
    }
  }
}
