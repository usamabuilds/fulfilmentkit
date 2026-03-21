import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import * as crypto from 'crypto';
import { z } from 'zod';
import { ConnectionsService } from './connections.service';
import { Roles } from '../common/auth/roles.decorator';
import { apiResponse } from '../common/utils/api-response';

const platformSchema = z.enum(['shopify', 'woocommerce', 'amazon', 'zoho', 'xero', 'sage', 'odoo', 'quickbooks']);
const shopifyStartPayloadSchema = z.object({
  shop: z.string().trim().min(1),
});
const shopifyCallbackQuerySchema = z.object({
  code: z.string().trim().min(1),
  shop: z.string().trim().min(1),
  state: z.string().trim().min(1),
  hmac: z.string().trim().min(1).optional(),
});

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  private verifyAndDecodeShopifyState(rawState: string): {
    workspaceId: string;
    connectionId: string;
    platform: 'shopify';
  } {
    const stateSecret = process.env.CONNECTION_SECRET_KEY;
    if (!stateSecret) {
      throw new Error('CONNECTION_SECRET_KEY must be set for Shopify state verification');
    }

    const [encodedPayload, signature] = rawState.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid Shopify state');
    }

    const expectedSignature = crypto
      .createHmac('sha256', stateSecret)
      .update(encodedPayload)
      .digest('base64url');

    if (
      expectedSignature.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    ) {
      throw new BadRequestException('Invalid Shopify state signature');
    }

    let decodedPayload: unknown;
    try {
      decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid Shopify state payload');
    }

    return z
      .object({
        workspaceId: z.string().trim().min(1),
        connectionId: z.string().trim().min(1),
        platform: z.literal('shopify'),
      })
      .parse(decodedPayload);
  }

  @Get()
  async list(@Req() req: any) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.list(workspaceId);
    return apiResponse(result);
  }

  @Post(':platform/start')
  @Roles('ADMIN', 'OWNER')
  async start(
    @Req() req: any,
    @Param('platform') platformRaw: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());
    const payload = platform === 'shopify'
      ? shopifyStartPayloadSchema.parse(body)
      : undefined;

    const result = await this.connectionsService.startConnectionFlow({
      workspaceId,
      platform,
      payload,
    });

    return apiResponse(result.data);
  }

  @Post(':platform/callback')
  @Roles('ADMIN', 'OWNER')
  async callback(
    @Req() req: any,
    @Param('platform') platformRaw: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;

    const platform = platformSchema.parse(platformRaw.toLowerCase());

    const result = await this.connectionsService.handleCallback({
      workspaceId,
      platform,
      payload: body,
    });

    return apiResponse(result.data);
  }

  @Get('shopify/callback')
  async shopifyCallback(@Query() query: Record<string, unknown>) {
    const parsedQuery = shopifyCallbackQuerySchema.parse(query);
    const state = this.verifyAndDecodeShopifyState(parsedQuery.state);

    const result = await this.connectionsService.handleCallback({
      workspaceId: state.workspaceId,
      platform: 'shopify',
      payload: {
        ...parsedQuery,
        connectionId: state.connectionId,
      },
    });

    return apiResponse(result.data);
  }

  @Post(':id/sync')
  @Roles('ADMIN', 'OWNER')
  async sync(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.triggerManualSync({
      workspaceId,
      connectionId,
    });

    return apiResponse(result.data);
  }

  @Get(':id/sync-runs')
  async listSyncRuns(@Req() req: any, @Param('id') connectionId: string) {
    const workspaceId = req.workspaceId as string;

    const result = await this.connectionsService.listSyncRuns({
      workspaceId,
      connectionId,
    });

    return apiResponse(result);
  }
}
