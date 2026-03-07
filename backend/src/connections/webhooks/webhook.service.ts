import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionPlatform } from '@prisma/client';

type IngestWebhookArgs = {
  workspaceId: string;
  platform: 'shopify' | 'woocommerce' | 'amazon';
  headers: any;
  payload: any;
};

@Injectable()
export class WebhookService {
  constructor(private readonly prisma: PrismaService) {}

  private toPlatformEnum(
    platform: 'shopify' | 'woocommerce' | 'amazon',
  ): ConnectionPlatform {
    if (platform === 'shopify') return 'SHOPIFY';
    if (platform === 'woocommerce') return 'WOOCOMMERCE';
    return 'AMAZON';
  }

  async ingestWebhook(args: IngestWebhookArgs) {
    const { workspaceId, platform, headers, payload } = args;

    const platformEnum = this.toPlatformEnum(platform);

    // IMPORTANT:
    // In real life, externalEventId must come from provider headers.
    // For v1 stub, we use header or fallback to payload.id.
    const externalEventId =
      headers['x-event-id'] ||
      headers['x-shopify-webhook-id'] ||
      payload?.id;

    if (!externalEventId) {
      return {
        success: false,
        error: {
          code: 'MISSING_EVENT_ID',
          message: 'Webhook missing external event id',
        },
      };
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

      // 2️⃣ Process event (v1 stub — no heavy logic yet)

      // simulate success
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
      if (
        typeof err?.code === 'string' &&
        err.code === 'P2002'
      ) {
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
