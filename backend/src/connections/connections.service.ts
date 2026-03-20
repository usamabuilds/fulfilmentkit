import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as crypto from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { toListResponse } from '../common/utils/list-response';
import { ConnectionPlatform, ConnectionStatus } from '../generated/prisma';

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

type StartConnectionFlowArgs = {
  workspaceId: string;
  platform: StartPlatform;
};

type CallbackArgs = {
  workspaceId: string;
  platform: StartPlatform;
  payload: any;
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

  async startConnectionFlow(args: StartConnectionFlowArgs) {
    const { workspaceId, platform } = args;

    // Workspace scoped fetch
    const connection = await this.prisma.connection.findFirst({
      where: {
        workspaceId,
        platform:
          platform === 'shopify'
            ? 'SHOPIFY'
            : platform === 'woocommerce'
              ? 'WOOCOMMERCE'
              : 'AMAZON',
      },
      select: {
        id: true,
        platform: true,
        status: true,
      },
    });

    if (!connection) {
      // We do NOT create records here, because start is about returning auth instructions/URL.
      // You can decide later whether "start" creates a placeholder connection or not.
      return {
        success: true,
        data: {
          platform,
          type: 'instructions',
          instructions: [
            'No Connection record exists for this platform yet in this workspace.',
            'Create the Connection row first (or decide that POST /connections/:platform/start should create it).',
            'Then implement the real OAuth / API-key flow under src/connections/connectors/<platform>.',
          ],
        },
      };
    }

    // For now this is a stub "start" response.
    // It must not expose tokens, so we return either:
    // - an authUrl (placeholder)
    // - or instructions for manual setup
    if (platform === 'shopify') {
      return {
        success: true,
        data: {
          connectionId: connection.id,
          platform,
          type: 'auth_url',
          authUrl: `https://example.com/oauth/shopify/start?connectionId=${connection.id}`,
          note: 'Placeholder URL for v1. Real Shopify OAuth will be wired later.',
        },
      };
    }

    if (platform === 'woocommerce') {
      return {
        success: true,
        data: {
          connectionId: connection.id,
          platform,
          type: 'instructions',
          instructions: [
            'WooCommerce v1 will use API keys (Consumer Key + Consumer Secret) stored server-side.',
            'Next step: build POST /connections/woocommerce/complete to submit keys securely (never return them).',
          ],
        },
      };
    }

    // amazon
    return {
      success: true,
      data: {
        connectionId: connection.id,
        platform,
        type: 'instructions',
        instructions: [
          'Amazon v1 will use SP-API auth (LWA + AWS keys) stored server-side.',
          'Next step: build POST /connections/amazon/complete to submit credentials securely (never return them).',
        ],
      },
    };
  }

  private getPlatformEnum(platform: StartPlatform) {
    return PLATFORM_MAP[platform];
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
    const { workspaceId, platform, payload } = args;

    const platformEnum = this.getPlatformEnum(platform);

    // Ensure connection exists + workspace scoped
    const connection = await this.prisma.connection.findFirst({
      where: {
        workspaceId,
        platform: platformEnum,
      },
      select: { id: true },
    });

    if (!connection) {
      throw new NotFoundException(
        'No Connection record exists for this platform in this workspace.',
      );
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
