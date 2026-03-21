import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { toListResponse } from '../common/utils/list-response';
import { ConnectionPlatform, ConnectionStatus } from '../generated/prisma';
import { StartConnectionResponseDto } from './dto/start-connection-response.dto';

type StartPlatform = 'shopify' | 'woocommerce' | 'amazon' | 'zoho' | 'xero' | 'sage' | 'odoo' | 'quickbooks';
type ConnectionAuthType =
  | 'oauth_callback'
  | 'api_keys_callback'
  | 'sp_api_callback'
  | 'oauth2';

const PLATFORM_MAP: Record<StartPlatform, ConnectionPlatform> = {
  shopify: 'SHOPIFY',
  woocommerce: 'WOOCOMMERCE',
  amazon: 'AMAZON',
  zoho: 'ZOHO',
  xero: 'XERO',
  sage: 'SAGE',
  odoo: 'ODOO',
  quickbooks: 'QUICKBOOKS',
} as const;

const AUTH_TYPE_MAP: Record<StartPlatform, ConnectionAuthType> = {
  shopify: 'oauth_callback',
  woocommerce: 'api_keys_callback',
  amazon: 'sp_api_callback',
  zoho: 'oauth2',
  xero: 'oauth2',
  sage: 'oauth2',
  odoo: 'oauth2',
  quickbooks: 'oauth2',
} as const;

const PLATFORM_DISPLAY_NAME_MAP: Record<ConnectionPlatform, string> = {
  SHOPIFY: 'Shopify',
  WOOCOMMERCE: 'WooCommerce',
  AMAZON: 'Amazon',
  ZOHO: 'Zoho',
  XERO: 'Xero',
  SAGE: 'Sage',
  ODOO: 'Odoo',
  QUICKBOOKS: 'QuickBooks',
};

type StartConnectionFlowArgs = {
  workspaceId: string;
  platform: StartPlatform;
  payload?: {
    shop: string;
  };
};

type CallbackArgs = {
  workspaceId: string;
  platform: StartPlatform;
  payload: any;
};

type ShopifyOAuthState = {
  workspaceId: string;
  connectionId: string;
  shop: string;
  iat: number;
  exp: number;
  nonce: string;
};

type TriggerManualSyncArgs = {
  workspaceId: string;
  connectionId: string;
};

type ListSyncRunsArgs = {
  workspaceId: string;
  connectionId: string;
};


/**
 * Canonical API status values for connection list responses.
 *
 * We expose lowercase values to the frontend regardless of Prisma enum casing.
 * "syncing" can be introduced later when we represent in-progress sync state.
 */
type ConnectionListStatus = 'active' | 'disconnected' | 'error';

const CONNECTION_LIST_STATUS_MAP: Record<ConnectionStatus, ConnectionListStatus> = {
  ACTIVE: 'active',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('sync') private readonly syncQueue: Queue,
  ) {}

  async list(workspaceId: string) {
    const rows = await this.prisma.connection.findMany({
      where: { workspaceId },
      orderBy: [{ platform: 'asc' }],
      select: {
        id: true,
        platform: true,
        status: true,
        displayName: true,
        lastSyncAt: true,
        lastError: true,
      },
    });

    return toListResponse({
      items: rows.map((r) => ({
        id: r.id,
        platform: r.platform,
        displayName: r.displayName,
        status: CONNECTION_LIST_STATUS_MAP[r.status],
        lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null,
        lastError: r.lastError ?? null,
      })),
      total: rows.length,
      page: 1,
      pageSize: rows.length,
    });
  }

  async startConnectionFlow(args: StartConnectionFlowArgs): Promise<{ success: true; data: StartConnectionResponseDto }> {
    const { workspaceId, platform, payload } = args;
    const platformEnum = this.getPlatformEnum(platform);
    const connection = await this.ensureConnection(workspaceId, platformEnum);

    // For now this is a stub "start" response.
    // It must not expose tokens, so we return either:
    // - a URL (placeholder)
    // - or setup instructions
    switch (platform) {
      case 'shopify': {
        const shop = this.normalizeAndValidateShopifyShop(payload?.shop);
        const url = this.buildShopifyOAuthUrl({
          workspaceId,
          connectionId: connection.id,
          shop,
        });

        return {
          success: true,
          data: {
            type: 'auth_url',
            url,
          },
        };
      }
      case 'woocommerce':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect WooCommerce with API keys',
            steps: [
              'Generate a Consumer Key and Consumer Secret in WooCommerce REST API settings.',
              'Keep the keys secure and submit them only to the backend completion endpoint when available.',
            ],
            message: 'WooCommerce uses API key credentials for this flow.',
          },
        };
      case 'amazon':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect Amazon SP-API',
            steps: [
              'Prepare your Amazon SP-API application credentials (LWA and AWS IAM configuration).',
              'Submit credentials through the backend completion endpoint when available.',
            ],
            message: 'Amazon setup requires SP-API credentials managed server-side.',
          },
        };
      case 'zoho':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect Zoho via OAuth 2.0',
            steps: [
              'Initiate the Zoho OAuth 2.0 authorization flow from the connector settings.',
              'Complete consent in Zoho and return to the callback endpoint when available.',
            ],
            message: 'Zoho integration uses OAuth 2.0 tokens stored server-side.',
          },
        };
      case 'xero':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect Xero via OAuth 2.0',
            steps: [
              'Start OAuth 2.0 authorization for your Xero organization.',
              'Approve access and complete callback handling when the endpoint is available.',
            ],
            message: 'Xero setup is OAuth 2.0 based and does not expose secrets in responses.',
          },
        };
      case 'sage':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect Sage via OAuth 2.0',
            steps: [
              'Authorize the Sage connector using OAuth 2.0 credentials.',
              'Finish consent and callback completion through the backend flow.',
            ],
            message: 'Sage integration currently returns setup instructions while OAuth completion is finalized.',
          },
        };
      case 'odoo':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect Odoo',
            steps: [
              'Prepare Odoo integration credentials and integration user permissions.',
              'Submit credentials to the backend completion endpoint when available.',
            ],
            message: 'Odoo connector support is scaffolded with placeholder setup guidance.',
          },
        };
      case 'quickbooks':
        return {
          success: true,
          data: {
            type: 'instructions',
            title: 'Connect QuickBooks via OAuth 2.0',
            steps: [
              'Start the QuickBooks OAuth 2.0 authorization process.',
              'Approve app access and complete callback handling when available.',
            ],
            message: 'QuickBooks integration is OAuth 2.0 based with server-side token storage.',
          },
        };
      default: {
        const unreachablePlatform: never = platform;
        throw new NotFoundException(
          `Unsupported platform: ${String(unreachablePlatform)}`,
        );
      }
    }
  }

  private getPlatformEnum(platform: StartPlatform) {
    return PLATFORM_MAP[platform];
  }

  private normalizeAndValidateShopifyShop(rawShop: string | undefined): string {
    const normalized = (rawShop ?? '').trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('shop is required for Shopify connection start');
    }

    if (
      normalized.includes('://') ||
      normalized.includes('/') ||
      normalized.includes('?') ||
      normalized.includes('#')
    ) {
      throw new BadRequestException('shop must be a plain myshopify domain (e.g. mystore.myshopify.com)');
    }

    const myShopifyDomainPattern = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
    if (!myShopifyDomainPattern.test(normalized)) {
      throw new BadRequestException('shop must match *.myshopify.com');
    }

    return normalized;
  }

  private buildShopifyOAuthUrl(args: {
    workspaceId: string;
    connectionId: string;
    shop: string;
  }): string {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = process.env.SHOPIFY_SCOPES;
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
    if (!clientId || !scopes || !redirectUri) {
      throw new Error(
        'SHOPIFY_CLIENT_ID, SHOPIFY_SCOPES, and SHOPIFY_REDIRECT_URI must be set',
      );
    }

    const state = this.generateAndSignShopifyOAuthState({
      workspaceId: args.workspaceId,
      connectionId: args.connectionId,
      shop: args.shop,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });

    return `https://${args.shop}/admin/oauth/authorize?${params.toString()}`;
  }

  private getOAuthStateSecret(): string {
    const stateSecret = process.env.CONNECTION_OAUTH_STATE_KEY ?? process.env.CONNECTION_SECRET_KEY;
    if (!stateSecret) {
      throw new Error(
        'CONNECTION_OAUTH_STATE_KEY (or CONNECTION_SECRET_KEY fallback) must be set for Shopify state signing',
      );
    }

    return stateSecret;
  }

  private generateAndSignShopifyOAuthState(args: {
    workspaceId: string;
    connectionId: string;
    shop: string;
  }): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload: ShopifyOAuthState = {
      workspaceId: args.workspaceId,
      connectionId: args.connectionId,
      shop: args.shop,
      iat: nowInSeconds,
      exp: nowInSeconds + 10 * 60,
      nonce: crypto.randomBytes(12).toString('hex'),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getOAuthStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyShopifyOAuthState(args: {
    state: unknown;
    shop: unknown;
  }): ShopifyOAuthState {
    if (typeof args.state !== 'string' || !args.state.trim()) {
      throw new BadRequestException('Missing Shopify OAuth state');
    }

    if (typeof args.shop !== 'string' || !args.shop.trim()) {
      throw new BadRequestException('Missing Shopify OAuth shop');
    }

    const [encodedPayload, signature] = args.state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid Shopify OAuth state');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.getOAuthStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    if (expectedSignature.length !== signature.length) {
      throw new BadRequestException('Invalid Shopify OAuth state signature');
    }

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      throw new BadRequestException('Invalid Shopify OAuth state signature');
    }

    let decodedPayload: unknown;
    try {
      decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid Shopify OAuth state payload');
    }

    if (typeof decodedPayload !== 'object' || decodedPayload === null) {
      throw new BadRequestException('Invalid Shopify OAuth state payload');
    }

    const payload = decodedPayload as Partial<ShopifyOAuthState>;
    if (
      typeof payload.workspaceId !== 'string' ||
      !payload.workspaceId.trim() ||
      typeof payload.connectionId !== 'string' ||
      !payload.connectionId.trim() ||
      typeof payload.shop !== 'string' ||
      !payload.shop.trim() ||
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      typeof payload.nonce !== 'string' ||
      !payload.nonce.trim()
    ) {
      throw new BadRequestException('Invalid Shopify OAuth state payload');
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowInSeconds) {
      throw new BadRequestException('Shopify OAuth state expired');
    }

    if (payload.iat > nowInSeconds + 60) {
      throw new BadRequestException('Invalid Shopify OAuth state issued-at time');
    }

    const callbackShop = this.normalizeAndValidateShopifyShop(args.shop);
    if (callbackShop !== payload.shop) {
      throw new BadRequestException('Shopify callback shop does not match OAuth state');
    }

    return {
      workspaceId: payload.workspaceId,
      connectionId: payload.connectionId,
      shop: payload.shop,
      iat: payload.iat,
      exp: payload.exp,
      nonce: payload.nonce,
    };
  }

  private async ensureConnection(workspaceId: string, platform: ConnectionPlatform) {
    return this.prisma.connection.upsert({
      where: {
        workspaceId_platform: {
          workspaceId,
          platform,
        },
      },
      create: {
        workspaceId,
        platform,
        status: 'DISCONNECTED',
        displayName: PLATFORM_DISPLAY_NAME_MAP[platform],
        lastError: null,
      },
      update: {},
      select: {
        id: true,
        platform: true,
        status: true,
      },
    });
  }

  private getAuthType(platform: StartPlatform) {
    return AUTH_TYPE_MAP[platform];
  }

  private encryptJson(payload: any) {
    const secret = process.env.CONNECTION_SECRET_KEY;
    if (!secret || secret.length < 32) {
      throw new Error('CONNECTION_SECRET_KEY must be set and at least 32 chars');
    }

    // Derive a stable 32-byte key from the secret string.
    // Salt is fixed for this app (v1). If we later rotate keys, we can version in metadata.
    const key = crypto.scryptSync(
      secret,
      'fulfilmentkit:connection_secret:v1',
      32,
    );

    const iv = crypto.randomBytes(12); // recommended size for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = Buffer.from(JSON.stringify(payload ?? {}), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      metadata: {
        v: 1,
        alg: 'aes-256-gcm',
        ivB64: iv.toString('base64'),
        tagB64: tag.toString('base64'),
      },
    };
  }

  async handleCallback(args: CallbackArgs) {
    const { platform, payload } = args;

    const platformEnum = this.getPlatformEnum(platform);

    let workspaceId = args.workspaceId;
    let connectionIdFromState: string | null = null;

    if (platform === 'shopify') {
      const verifiedState = this.verifyShopifyOAuthState({
        state: payload?.state,
        shop: payload?.shop,
      });
      workspaceId = verifiedState.workspaceId;
      connectionIdFromState = verifiedState.connectionId;
    }

    const connection = connectionIdFromState
      ? await this.prisma.connection.findFirst({
          where: {
            id: connectionIdFromState,
            workspaceId,
            platform: platformEnum,
          },
          select: {
            id: true,
            platform: true,
            status: true,
          },
        })
      : await this.ensureConnection(workspaceId, platformEnum);

    if (!connection) {
      throw new NotFoundException('Connection not found for verified Shopify OAuth state.');
    }

    // Encrypt payload (server-side only)
    const { ciphertext, metadata } = this.encryptJson(payload);

    // Store secret (upsert by connectionId, never return it)
    await this.prisma.connectionSecret.upsert({
      where: { connectionId: connection.id },
      create: {
        connectionId: connection.id,
        workspaceId,
        platform: platformEnum,
        authType: this.getAuthType(platform),
        secretCiphertext: ciphertext,
        secretMetadata: {
          ...metadata,
          receivedAt: new Date().toISOString(),
          payloadKeys:
            payload && typeof payload === 'object' ? Object.keys(payload) : [],
        },
        lastValidatedAt: new Date(),
      },
      update: {
        workspaceId,
        platform: platformEnum,
        authType: this.getAuthType(platform),
        secretCiphertext: ciphertext,
        secretMetadata: {
          ...metadata,
          receivedAt: new Date().toISOString(),
          payloadKeys:
            payload && typeof payload === 'object' ? Object.keys(payload) : [],
        },
        lastValidatedAt: new Date(),
      },
    });

    // Update connection status
    await this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: 'ACTIVE',
        lastError: null,
      },
      select: { id: true },
    });

    // Never return secrets
    return {
      success: true,
      data: {
        connectionId: connection.id,
        platform,
        stored: true,
        status: 'connected',
      },
    };
  }

  async triggerManualSync(args: TriggerManualSyncArgs) {
    const { workspaceId, connectionId } = args;

    // Ensure connection belongs to this workspace
    const connection = await this.prisma.connection.findFirst({
      where: { id: connectionId, workspaceId },
      select: { id: true, platform: true, status: true },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found for this workspace.');
    }

    // Create SyncRun as QUEUED
    const syncRun = await this.prisma.syncRun.create({
      data: {
        workspaceId,
        connectionId: connection.id,
        status: 'QUEUED',
      },
      select: { id: true },
    });

    // Idempotency: (workspaceId + channel + externalId)
    // For manual sync we treat:
    // - channel = connection.platform
    // - externalId = syncRun.id (unique per run)
    const idempotencyKey = `${workspaceId}:${connection.platform}:${syncRun.id}`;

    const job = await this.syncQueue.add(
      'sync:run_connection',
      {
        workspaceId,
        connectionId: connection.id,
        syncRunId: syncRun.id,
        idempotencyKey,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        jobId: job.id ? String(job.id) : null,
      },
      select: { id: true },
    });

    return {
      success: true,
      data: {
        syncRunId: syncRun.id,
      },
    };
  }

  async listSyncRuns(args: ListSyncRunsArgs) {
    const { workspaceId, connectionId } = args;

    // Ensure connection belongs to workspace
    const connection = await this.prisma.connection.findFirst({
      where: { id: connectionId, workspaceId },
      select: { id: true },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found for this workspace.');
    }

    const runs = await this.prisma.syncRun.findMany({
      where: {
        workspaceId,
        connectionId: connection.id,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        status: true,
        jobId: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        error: true,
      },
    });

    return toListResponse({
      items: runs.map((r) => ({
        id: r.id,
        status: r.status,
        jobId: r.jobId ?? null,
        createdAt: r.createdAt.toISOString(),
        startedAt: r.startedAt ? r.startedAt.toISOString() : null,
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
        error: r.error ?? null,
        counts: null, // v1: counts not tracked yet (added when sync worker exists)
      })),
      total: runs.length,
      page: 1,
      pageSize: runs.length,
    });
  }
}
