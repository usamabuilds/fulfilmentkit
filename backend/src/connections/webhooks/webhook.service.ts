import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionPlatform, Prisma } from '../../generated/prisma';

type IngestWebhookArgs = {
  workspaceId: string;
  platform: 'shopify' | 'woocommerce' | 'amazon';
  headers: any;
  payload: any;
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
    if (!externalRef) return;

    const orderNumber = this.asNonEmptyString(
      payload?.order_number ?? payload?.number ?? payload?.name,
    );

    const status = this.asNonEmptyString(payload?.financial_status ?? payload?.status);

    if (!status) return;

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

    await (this.prisma.order as any).upsert({
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
    });
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
        },
      });

      // 2️⃣ Process event
      await this.upsertOrderFromPayload({ workspaceId, platform, payload });

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
