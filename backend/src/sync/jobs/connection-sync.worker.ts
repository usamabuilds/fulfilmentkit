import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Processor('sync') // queue name (no colons)
export class ConnectionSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ConnectionSyncWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'sync:run_connection') return;

    const { workspaceId, connectionId, syncRunId } = job.data as {
      workspaceId: string;
      connectionId: string;
      syncRunId: string;
      idempotencyKey?: string;
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

    const startedAt = new Date();

    try {
      this.logger.log(
        `Starting sync run=${syncRunId} workspace=${workspaceId} connection=${connectionId}`,
      );

      await this.prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          status: 'RUNNING',
          startedAt,
          error: null,
        },
      });

      // v1 stub: no external API calls yet

      const finishedAt = new Date();

      await this.prisma.syncRun.update({
        where: { id: syncRunId },
        data: {
          status: 'SUCCESS',
          finishedAt,
        },
      });

      await this.prisma.connection.update({
        where: { id: connectionId },
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
        where: { id: syncRunId },
        data: {
          status: 'FAILED',
          finishedAt,
          error: message,
        },
      });

      await this.prisma.connection.update({
        where: { id: connectionId },
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
