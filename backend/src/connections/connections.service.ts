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
  platform: 'shopify';
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
        const url = await this.buildShopifyOAuthUrl({
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
              'Submit credentials to POST /connections/woocommerce/callback to complete storage and activation.',
            ],
            message: 'WooCommerce uses API key credentials for this flow; start only initializes the connection record.',
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
      {
        const url = await this.buildXeroAuthorizeUrl({
          workspaceId,
          connectionId: connection.id,
        });

        return {
          success: true,
          data: {
            type: 'auth_url',
            url,
          },
        };
      }
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
  }): Promise<string> {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const scopes = process.env.SHOPIFY_SCOPES;
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
    if (!clientId || !scopes || !redirectUri) {
      throw new Error(
        'SHOPIFY_CLIENT_ID, SHOPIFY_SCOPES, and SHOPIFY_REDIRECT_URI must be set',
      );
    }

    return this.createAndStoreOAuthStateAtStart({
      workspaceId: args.workspaceId,
      connectionId: args.connectionId,
      platform: 'SHOPIFY',
      buildStateToken: (expiresAt) => this.generateAndSignShopifyOAuthState({
        workspaceId: args.workspaceId,
        connectionId: args.connectionId,
        shop: args.shop,
        expiresAt,
      }),
    }).then((state) => {
      const params = new URLSearchParams({
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        state,
      });

      return `https://${args.shop}/admin/oauth/authorize?${params.toString()}`;
    });
  }

  private getXeroOAuthConfig(): {
    clientId: string;
    redirectUri: string;
    scopes: string;
  } {
    const clientId = process.env.XERO_CLIENT_ID;
    const redirectUri = process.env.XERO_REDIRECT_URI;
    const scopes = process.env.XERO_SCOPES;

    if (!clientId || !redirectUri || !scopes) {
      throw new Error(
        'XERO_CLIENT_ID, XERO_REDIRECT_URI, and XERO_SCOPES must be set',
      );
    }

    return {
      clientId,
      redirectUri,
      scopes,
    };
  }

  private getXeroTokenConfig(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;
    const redirectUri = process.env.XERO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI must be set',
      );
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
    };
  }

  private async buildXeroAuthorizeUrl(args: {
    workspaceId: string;
    connectionId: string;
  }): Promise<string> {
    const config = this.getXeroOAuthConfig();
    const state = await this.createAndStoreOAuthStateAtStart({
      workspaceId: args.workspaceId,
      connectionId: args.connectionId,
      platform: 'XERO',
      buildStateToken: () => Buffer.from(
        JSON.stringify({
          workspaceId: args.workspaceId,
          connectionId: args.connectionId,
          nonce: crypto.randomBytes(16).toString('hex'),
        }),
        'utf8',
      ).toString('base64url'),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes,
      state,
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
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

  private hashOAuthState(state: string): string {
    return crypto.createHash('sha256').update(state, 'utf8').digest('hex');
  }

  private async createAndStoreOAuthStateAtStart(args: {
    workspaceId: string;
    connectionId: string;
    platform: ConnectionPlatform;
    buildStateToken: (expiresAt: Date) => string;
    ttlMs?: number;
  }): Promise<string> {
    const ttlMs = args.ttlMs ?? 10 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const state = args.buildStateToken(expiresAt);

    await this.prisma.$executeRaw`
      INSERT INTO "ConnectionOAuthState" (
        "id",
        "workspaceId",
        "connectionId",
        "platform",
        "stateHash",
        "expiresAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${args.workspaceId},
        ${args.connectionId},
        ${args.platform}::"ConnectionPlatform",
        ${this.hashOAuthState(state)},
        ${expiresAt},
        NOW(),
        NOW()
      )
    `;

    return state;
  }

  private async lookupAndValidateOAuthStateOnCallback(args: {
    state: unknown;
    platform: ConnectionPlatform;
    expectedWorkspaceId?: string;
    expectedConnectionId?: string;
  }): Promise<{ workspaceId: string; connectionId: string }> {
    if (typeof args.state !== 'string' || !args.state.trim()) {
      throw new BadRequestException('Missing OAuth state');
    }

    const stateHash = this.hashOAuthState(args.state);
    const consumedRows = await this.prisma.$queryRaw<Array<{
      workspaceId: string;
      connectionId: string;
    }>>`
      UPDATE "ConnectionOAuthState"
      SET "usedAt" = NOW(), "updatedAt" = NOW()
      WHERE "stateHash" = ${stateHash}
        AND "platform" = ${args.platform}::"ConnectionPlatform"
        AND "usedAt" IS NULL
        AND "expiresAt" > NOW()
      RETURNING "workspaceId", "connectionId"
    `;

    const consumedState = consumedRows[0];
    if (!consumedState) {
      throw new BadRequestException('Invalid, expired, or already-used OAuth state');
    }

    if (args.expectedWorkspaceId && consumedState.workspaceId !== args.expectedWorkspaceId) {
      throw new BadRequestException('OAuth state workspace mismatch');
    }
    if (args.expectedConnectionId && consumedState.connectionId !== args.expectedConnectionId) {
      throw new BadRequestException('OAuth state connection mismatch');
    }

    return consumedState;
  }

  private generateAndSignShopifyOAuthState(args: {
    workspaceId: string;
    connectionId: string;
    shop: string;
    expiresAt: Date;
  }): string {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const payload: ShopifyOAuthState = {
      workspaceId: args.workspaceId,
      connectionId: args.connectionId,
      platform: 'shopify',
      shop: args.shop,
      iat: nowInSeconds,
      exp: Math.floor(args.expiresAt.getTime() / 1000),
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
      payload.platform !== 'shopify' ||
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
      platform: payload.platform,
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

  private getShopifyCredentials() {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set');
    }

    return { clientId, clientSecret };
  }

  private toConnectionErrorMessage(error: unknown): string {
    const fallback = 'Callback handling failed';
    const message = error instanceof Error ? error.message : fallback;
    return message.slice(0, 1000);
  }

  private async markConnectionAsError(connectionId: string, error: unknown) {
    await this.prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: 'ERROR',
        lastError: this.toConnectionErrorMessage(error),
      },
      select: { id: true },
    });
  }

  private async exchangeShopifyAccessToken(args: {
    shop: string;
    code: string;
  }): Promise<{
    accessToken: string;
    scopes: string[];
    associatedUserScopes: string[];
    tokenType: string | null;
    rawResponseKeys: string[];
  }> {
    const { clientId, clientSecret } = this.getShopifyCredentials();

    const response = await fetch(`https://${args.shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
      }),
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        throw new BadRequestException(
          `Shopify token exchange failed with status ${response.status}`,
        );
      }
      throw new BadRequestException('Invalid Shopify token response payload');
    }

    if (!response.ok) {
      const details =
        typeof data === 'object' && data !== null
          ? [
              typeof (data as { error?: unknown }).error === 'string'
                ? (data as { error: string }).error
                : null,
              typeof (data as { error_description?: unknown }).error_description === 'string'
                ? (data as { error_description: string }).error_description
                : null,
            ]
              .filter(Boolean)
              .join(': ')
          : '';

      throw new BadRequestException(
        details
          ? `Shopify token exchange failed with status ${response.status}: ${details}`
          : `Shopify token exchange failed with status ${response.status}`,
      );
    }

    if (typeof data !== 'object' || data === null) {
      throw new BadRequestException('Invalid Shopify token response payload');
    }

    const accessToken = (data as { access_token?: unknown }).access_token;
    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new BadRequestException('Shopify token response missing access_token');
    }

    const scope = (data as { scope?: unknown }).scope;
    const associatedUserScope = (data as { associated_user_scope?: unknown }).associated_user_scope;
    const tokenType = (data as { token_type?: unknown }).token_type;

    return {
      accessToken,
      scopes:
        typeof scope === 'string'
          ? scope.split(',').map((value) => value.trim()).filter(Boolean)
          : [],
      associatedUserScopes:
        typeof associatedUserScope === 'string'
          ? associatedUserScope.split(',').map((value) => value.trim()).filter(Boolean)
          : [],
      tokenType: typeof tokenType === 'string' ? tokenType : null,
      rawResponseKeys: Object.keys(data),
    };
  }

  private async exchangeXeroAccessToken(args: {
    code: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
    tokenType: string;
    rawResponseKeys: string[];
  }> {
    const { clientId, clientSecret, redirectUri } = this.getXeroTokenConfig();
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

    const formBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: args.code,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${basicAuth}`,
      },
      body: formBody.toString(),
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        throw new BadRequestException(
          `Xero token exchange failed with status ${response.status}`,
        );
      }
      throw new BadRequestException('Invalid Xero token response payload');
    }

    if (!response.ok) {
      const details =
        typeof data === 'object' && data !== null
          ? [
              typeof (data as { error?: unknown }).error === 'string'
                ? (data as { error: string }).error
                : null,
              typeof (data as { error_description?: unknown }).error_description === 'string'
                ? (data as { error_description: string }).error_description
                : null,
            ]
              .filter(Boolean)
              .join(': ')
          : '';

      throw new BadRequestException(
        details
          ? `Xero token exchange failed with status ${response.status}: ${details}`
          : `Xero token exchange failed with status ${response.status}`,
      );
    }

    if (typeof data !== 'object' || data === null) {
      throw new BadRequestException('Invalid Xero token response payload');
    }

    const accessToken = (data as { access_token?: unknown }).access_token;
    const refreshToken = (data as { refresh_token?: unknown }).refresh_token;
    const expiresIn = (data as { expires_in?: unknown }).expires_in;
    const scope = (data as { scope?: unknown }).scope;
    const tokenType = (data as { token_type?: unknown }).token_type;

    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new BadRequestException('Xero token response missing access_token');
    }
    if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new BadRequestException('Xero token response missing refresh_token');
    }
    if (!Number.isFinite(expiresIn) || typeof expiresIn !== 'number' || expiresIn <= 0) {
      throw new BadRequestException('Xero token response missing expires_in');
    }
    if (typeof scope !== 'string' || !scope.trim()) {
      throw new BadRequestException('Xero token response missing scope');
    }
    if (typeof tokenType !== 'string' || !tokenType.trim()) {
      throw new BadRequestException('Xero token response missing token_type');
    }

    return {
      accessToken: accessToken.trim(),
      refreshToken: refreshToken.trim(),
      expiresIn,
      scope: scope.trim(),
      tokenType: tokenType.trim(),
      rawResponseKeys: Object.keys(data),
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
      const consumedState = await this.lookupAndValidateOAuthStateOnCallback({
        state: payload?.state,
        platform: 'SHOPIFY',
        expectedWorkspaceId: verifiedState.workspaceId,
        expectedConnectionId: verifiedState.connectionId,
      });
      workspaceId = consumedState.workspaceId;
      connectionIdFromState = consumedState.connectionId;
    }

    if (platform === 'xero') {
      const connectionIdFromPayload = typeof payload?.connectionId === 'string'
        ? payload.connectionId.trim()
        : '';
      const consumedState = await this.lookupAndValidateOAuthStateOnCallback({
        state: payload?.state,
        platform: 'XERO',
        expectedWorkspaceId: args.workspaceId,
        expectedConnectionId: connectionIdFromPayload || undefined,
      });
      workspaceId = consumedState.workspaceId;
      connectionIdFromState = consumedState.connectionId;
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

    try {
      let secretPayload: any = payload;
      let providerMetadata: Record<string, unknown> = {
        payloadKeys:
          payload && typeof payload === 'object' ? Object.keys(payload) : [],
      };

      if (platform === 'shopify') {
        if (typeof payload?.code !== 'string' || !payload.code.trim()) {
          throw new BadRequestException('Missing Shopify OAuth code');
        }

        const shop = this.normalizeAndValidateShopifyShop(
          typeof payload?.shop === 'string' ? payload.shop : undefined,
        );

        const tokenResponse = await this.exchangeShopifyAccessToken({
          shop,
          code: payload.code,
        });
        const nowIso = new Date().toISOString();

        secretPayload = {
          accessToken: tokenResponse.accessToken,
        };
        providerMetadata = {
          shop,
          scopes: tokenResponse.scopes,
          associatedUserScopes: tokenResponse.associatedUserScopes,
          tokenType: tokenResponse.tokenType,
          tokenReceivedAt: nowIso,
          oauthCompletedAt: nowIso,
          shopifyResponseKeys: tokenResponse.rawResponseKeys,
        };
      }

      if (platform === 'xero') {
        const xeroError = typeof payload?.error === 'string' ? payload.error.trim() : '';
        const xeroErrorDescription = typeof payload?.error_description === 'string'
          ? payload.error_description.trim()
          : '';
        const code = typeof payload?.code === 'string' ? payload.code.trim() : '';

        if (xeroError) {
          throw new BadRequestException(xeroErrorDescription || xeroError);
        }
        if (!code) {
          throw new BadRequestException('Missing Xero OAuth code');
        }

        const tokenResponse = await this.exchangeXeroAccessToken({ code });
        const now = new Date();
        const nowIso = now.toISOString();
        const expiresAtIso = new Date(now.getTime() + tokenResponse.expiresIn * 1000).toISOString();
        const scopeList = tokenResponse.scope.split(/\s+/).map((value) => value.trim()).filter(Boolean);

        secretPayload = {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresIn: tokenResponse.expiresIn,
          tokenType: tokenResponse.tokenType,
          scope: tokenResponse.scope,
        };
        providerMetadata = {
          scopes: scopeList,
          tokenType: tokenResponse.tokenType,
          expiresIn: tokenResponse.expiresIn,
          accessTokenExpiresAt: expiresAtIso,
          tokenReceivedAt: nowIso,
          oauthCompletedAt: nowIso,
          xeroResponseKeys: tokenResponse.rawResponseKeys,
        };
      }

      if (platform === 'woocommerce') {
        if (typeof payload?.storeUrl !== 'string' || !payload.storeUrl.trim()) {
          throw new BadRequestException('Missing WooCommerce store URL');
        }
        if (typeof payload?.consumerKey !== 'string' || !payload.consumerKey.trim()) {
          throw new BadRequestException('Missing WooCommerce consumer key');
        }
        if (typeof payload?.consumerSecret !== 'string' || !payload.consumerSecret.trim()) {
          throw new BadRequestException('Missing WooCommerce consumer secret');
        }

        const normalizedStoreUrl = this.normalizeWooCommerceStoreUrl(payload.storeUrl);
        const consumerKey = payload.consumerKey.trim();
        const consumerSecret = payload.consumerSecret.trim();

        const validatedEndpointUrl = new URL(`${normalizedStoreUrl}/wp-json/wc/v3/system_status`);
        validatedEndpointUrl.searchParams.set('consumer_key', consumerKey);
        validatedEndpointUrl.searchParams.set('consumer_secret', consumerSecret);

        const abortController = new AbortController();
        const timeoutMs = 10000;
        const timeout = setTimeout(() => abortController.abort(), timeoutMs);

        try {
          const response = await fetch(validatedEndpointUrl.toString(), {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
            signal: abortController.signal,
          });

          if (!response.ok) {
            const statusMessage = Number.isInteger(response.status)
              ? ` (status ${response.status})`
              : '';
            throw new BadRequestException(
              `Invalid WooCommerce credentials or store URL${statusMessage}`,
            );
          }

          let systemStatusPayload: unknown = null;
          try {
            systemStatusPayload = await response.json();
          } catch {
            throw new BadRequestException('Invalid WooCommerce credentials or store URL');
          }

          if (
            typeof systemStatusPayload !== 'object'
            || systemStatusPayload === null
            || Array.isArray(systemStatusPayload)
          ) {
            throw new BadRequestException('Invalid WooCommerce credentials or store URL');
          }

          const payloadRecord = systemStatusPayload as Record<string, unknown>;
          const hasExpectedKeys =
            'environment' in payloadRecord
            && 'database' in payloadRecord
            && 'active_plugins' in payloadRecord;
          if (!hasExpectedKeys) {
            throw new BadRequestException('Invalid WooCommerce credentials or store URL');
          }

          const apiVersion = typeof payloadRecord.version === 'string'
            ? payloadRecord.version
            : null;

          const nowIso = new Date().toISOString();
          secretPayload = {
            storeUrl: normalizedStoreUrl,
            consumerKey,
            consumerSecret,
          };
          providerMetadata = {
            storeUrl: normalizedStoreUrl,
            validatedEndpoint: validatedEndpointUrl.origin + validatedEndpointUrl.pathname,
            validatedAt: nowIso,
            ...(apiVersion ? { apiVersion } : {}),
          };
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          if (error instanceof Error && error.name === 'AbortError') {
            throw new BadRequestException('Invalid WooCommerce credentials or store URL');
          }
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      }

      // Encrypt payload (server-side only)
      const { ciphertext, metadata } = this.encryptJson(secretPayload);

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
            ...providerMetadata,
            receivedAt: new Date().toISOString(),
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
            ...providerMetadata,
            receivedAt: new Date().toISOString(),
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
    } catch (error) {
      await this.markConnectionAsError(connection.id, error);
      throw error;
    }

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

  private normalizeWooCommerceStoreUrl(storeUrl: string): string {
    const trimmedStoreUrl = storeUrl.trim();
    const storeUrlWithProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedStoreUrl)
      ? trimmedStoreUrl
      : `https://${trimmedStoreUrl}`;

    let parsedStoreUrl: URL;
    try {
      parsedStoreUrl = new URL(storeUrlWithProtocol);
    } catch {
      throw new BadRequestException('Invalid WooCommerce credentials or store URL');
    }

    parsedStoreUrl.pathname = parsedStoreUrl.pathname.replace(/\/+$/, '');
    parsedStoreUrl.search = '';
    parsedStoreUrl.hash = '';

    return parsedStoreUrl.toString().replace(/\/$/, '');
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
