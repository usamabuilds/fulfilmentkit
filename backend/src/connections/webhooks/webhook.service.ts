import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionPlatform, Prisma } from '../../generated/prisma';
import * as crypto from 'crypto';

type IngestWebhookArgs = {
  platform: 'shopify' | 'woocommerce' | 'amazon';
  headers: any;
  payload: any;
  rawBody: Buffer | undefined;
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

  private getHeaderValue(headers: any, key: string): string | null {
    const value = headers?.[key] ?? headers?.[key.toLowerCase()] ?? headers?.[key.toUpperCase()];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private verifyShopifyAuthenticity(args: { headers: any; rawBody: Buffer | undefined }) {
    const { headers, rawBody } = args;
    const sharedSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!sharedSecret) {
      throw new BadRequestException('Shopify webhook verification secret is not configured');
    }

    const providedSignature = this.getHeaderValue(headers, 'x-shopify-hmac-sha256');
    if (!providedSignature) {
      throw new BadRequestException('Shopify webhook signature header is required');
    }

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Webhook raw payload is required for signature verification');
    }

    const expectedSignature = crypto
      .createHmac('sha256', sharedSecret)
      .update(rawBody)
      .digest('base64');

    if (expectedSignature.length !== providedSignature.length) {
      throw new BadRequestException('Invalid Shopify webhook signature');
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(providedSignature, 'utf8'),
      )
    ) {
      throw new BadRequestException('Invalid Shopify webhook signature');
    }
  }

  private verifyAuthenticity(args: {
    platform: 'shopify' | 'woocommerce' | 'amazon';
    headers: any;
    rawBody: Buffer | undefined;
  }) {
    if (args.platform === 'shopify') {
      this.verifyShopifyAuthenticity({ headers: args.headers, rawBody: args.rawBody });
      return;
    }

    throw new BadRequestException(
      `${args.platform} webhook authenticity verification is not configured yet`,
    );
  }

  private normalizeShopifyDomain(value: unknown): string | null {
    const raw = this.asNonEmptyString(value)?.toLowerCase();
    if (!raw) return null;

    const myShopifyDomainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
    if (!myShopifyDomainPattern.test(raw)) return null;

    return raw;
  }

  private extractShopifyShopDomain(headers: any): string {
    const shopDomainHeader = this.getHeaderValue(headers, 'x-shopify-shop-domain');
    const normalizedShopDomain = this.normalizeShopifyDomain(shopDomainHeader);

    if (!normalizedShopDomain) {
      throw new BadRequestException('Shopify webhook shop domain header is required');
    }

    return normalizedShopDomain;
  }

  private async resolveWorkspaceForVerifiedWebhook(args: {
    platform: 'shopify' | 'woocommerce' | 'amazon';
    headers: any;
  }): Promise<string> {
    if (args.platform !== 'shopify') {
      throw new BadRequestException(
        `${args.platform} webhook workspace resolution is not configured yet`,
      );
    }

    const shopDomain = this.extractShopifyShopDomain(args.headers);

    const candidateConnections = await this.prisma.connection.findMany({
      where: {
        platform: 'SHOPIFY',
      },
      select: {
        workspaceId: true,
        secret: {
          select: {
            workspaceId: true,
            secretMetadata: true,
          },
        },
      },
    });

    const mappedWorkspaceIds = new Set<string>();

    for (const connection of candidateConnections) {
      const metadataShop = this.normalizeShopifyDomain(
        (connection.secret?.secretMetadata as any)?.shop,
      );
      if (!metadataShop || metadataShop !== shopDomain) continue;

      if (!connection.secret) {
        continue;
      }

      if (connection.secret.workspaceId !== connection.workspaceId) {
        throw new BadRequestException(
          'Shopify webhook workspace mapping is internally inconsistent',
        );
      }

      mappedWorkspaceIds.add(connection.workspaceId);
    }

    const resolvedWorkspaceIds = Array.from(mappedWorkspaceIds);
    if (resolvedWorkspaceIds.length === 0) {
      throw new BadRequestException('No workspace mapping found for verified Shopify webhook');
    }

    if (resolvedWorkspaceIds.length > 1) {
      throw new BadRequestException('Shopify webhook workspace mapping is ambiguous');
    }

    return resolvedWorkspaceIds[0];
  }

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
    const { platform, headers, payload, rawBody } = args;

    this.verifyAuthenticity({ platform, headers, rawBody });
    const workspaceId = await this.resolveWorkspaceForVerifiedWebhook({ platform, headers });

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
