import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Response } from 'express';
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

const woocommerceCallbackBodySchema = z.object({
  storeUrl: z.string().trim().min(1),
  consumerKey: z.string().trim().min(1),
  consumerSecret: z.string().trim().min(1),
});
const xeroCallbackQuerySchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1),
  error: z.string().trim().min(1).optional(),
  error_description: z.string().trim().min(1).optional(),
});
const zohoCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1),
  error: z.string().trim().min(1).optional(),
  error_description: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.code || value.error), {
  message: 'Missing Zoho OAuth response payload',
});
const quickbooksCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1),
  realmId: z.string().trim().min(1).optional(),
  error: z.string().trim().min(1).optional(),
  error_description: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.code || value.error), {
  message: 'Missing QuickBooks OAuth response payload',
}).refine((value) => Boolean(value.error || value.realmId), {
  message: 'Missing QuickBooks realmId',
});

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  private getFrontendConnectionsUrl(): URL {
    // Explicitly source frontend redirect base from configuration:
    // prefer FRONTEND_BASE_URL (dedicated frontend origin), then fall back to API_BASE_URL.
    const configuredBaseUrl = process.env.FRONTEND_BASE_URL ?? process.env.API_BASE_URL;
    if (!configuredBaseUrl) {
      throw new Error('Either FRONTEND_BASE_URL or API_BASE_URL must be configured');
    }

    return new URL('/connections', configuredBaseUrl);
  }

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

  private resolveOAuthCallbackContext(rawState: string, provider: 'Xero' | 'Zoho' | 'QuickBooks'): {
    workspaceId: string;
    connectionId: string;
  } {
    let decodedPayload: unknown;
    try {
      decodedPayload = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException(`Invalid ${provider} state`);
    }

    return z
      .object({
        workspaceId: z.string().trim().min(1),
        connectionId: z.string().trim().min(1),
      })
      .parse(decodedPayload);
  }

  private toConciseCallbackError(error: unknown): string {
    const fallback = 'callback_failed';
    if (!(error instanceof Error) || !error.message.trim()) {
      return fallback;
    }

    return error.message
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || fallback;
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

    const payload = platform === 'woocommerce'
      ? woocommerceCallbackBodySchema.parse(body)
      : body;

    const result = await this.connectionsService.handleCallback({
      workspaceId,
      platform,
      payload,
    });

    return apiResponse(result.data);
  }

  @Get('shopify/callback')
  async shopifyCallback(@Query() query: Record<string, unknown>, @Res() res: Response): Promise<void> {
    const redirectUrl = this.getFrontendConnectionsUrl();

    try {
      const parsedQuery = shopifyCallbackQuerySchema.parse(query);
      const state = this.verifyAndDecodeShopifyState(parsedQuery.state);

      await this.connectionsService.handleCallback({
        workspaceId: state.workspaceId,
        platform: 'shopify',
        payload: {
          ...parsedQuery,
          connectionId: state.connectionId,
        },
      });

      res.redirect(redirectUrl.toString());
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Shopify callback failed';
      redirectUrl.searchParams.set('shopify_error', errorMessage);
      res.redirect(redirectUrl.toString());
      return;
    }
  }

  @Get('xero/callback')
  async xeroCallback(@Query() query: Record<string, unknown>, @Res() res: Response): Promise<void> {
    const redirectUrl = this.getFrontendConnectionsUrl();

    try {
      const parsedQuery = xeroCallbackQuerySchema.parse(query);

      if (parsedQuery.error) {
        throw new BadRequestException(parsedQuery.error_description ?? parsedQuery.error);
      }

      const context = this.resolveOAuthCallbackContext(parsedQuery.state, 'Xero');

      await this.connectionsService.handleCallback({
        workspaceId: context.workspaceId,
        platform: 'xero',
        payload: {
          code: parsedQuery.code,
          state: parsedQuery.state,
          connectionId: context.connectionId,
        },
      });

      redirectUrl.searchParams.set('xero', 'success');
      res.redirect(redirectUrl.toString());
      return;
    } catch (error) {
      redirectUrl.searchParams.set('xero_error', this.toConciseCallbackError(error));
      res.redirect(redirectUrl.toString());
      return;
    }
  }

  @Get('zoho/callback')
  async zohoCallback(@Query() query: Record<string, unknown>, @Res() res: Response): Promise<void> {
    const redirectUrl = this.getFrontendConnectionsUrl();

    try {
      const parsedQuery = zohoCallbackQuerySchema.parse(query);

      if (parsedQuery.error) {
        throw new BadRequestException(parsedQuery.error_description ?? parsedQuery.error);
      }
      if (!parsedQuery.code) {
        throw new BadRequestException('Missing Zoho OAuth code');
      }

      const context = this.resolveOAuthCallbackContext(parsedQuery.state, 'Zoho');

      await this.connectionsService.handleCallback({
        workspaceId: context.workspaceId,
        platform: 'zoho',
        payload: {
          code: parsedQuery.code,
          state: parsedQuery.state,
          connectionId: context.connectionId,
        },
      });

      redirectUrl.searchParams.set('zoho', 'success');
      res.redirect(redirectUrl.toString());
      return;
    } catch (error) {
      redirectUrl.searchParams.set('zoho_error', this.toConciseCallbackError(error));
      res.redirect(redirectUrl.toString());
      return;
    }
  }

  @Get('quickbooks/callback')
  async quickbooksCallback(@Query() query: Record<string, unknown>, @Res() res: Response): Promise<void> {
    const redirectUrl = this.getFrontendConnectionsUrl();

    try {
      const parsedQuery = quickbooksCallbackQuerySchema.parse(query);

      if (parsedQuery.error) {
        throw new BadRequestException(parsedQuery.error_description ?? parsedQuery.error);
      }
      if (!parsedQuery.code) {
        throw new BadRequestException('Missing QuickBooks OAuth code');
      }
      if (!parsedQuery.realmId) {
        throw new BadRequestException('Missing QuickBooks realmId');
      }

      const context = this.resolveOAuthCallbackContext(parsedQuery.state, 'QuickBooks');

      await this.connectionsService.handleCallback({
        workspaceId: context.workspaceId,
        platform: 'quickbooks',
        payload: {
          code: parsedQuery.code,
          state: parsedQuery.state,
          connectionId: context.connectionId,
          realmId: parsedQuery.realmId,
        },
      });

      redirectUrl.searchParams.set('quickbooks', 'success');
      res.redirect(redirectUrl.toString());
      return;
    } catch (error) {
      redirectUrl.searchParams.set('quickbooks_error', this.toConciseCallbackError(error));
      res.redirect(redirectUrl.toString());
      return;
    }
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
