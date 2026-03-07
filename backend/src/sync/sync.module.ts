import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';
import { MetricsWorker } from './jobs/sync.worker';
import { ConnectionSyncWorker } from './jobs/connection-sync.worker';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL,
      },
    }),

    BullModule.registerQueue({ name: 'sync' }, { name: 'metrics' }),

    PrismaModule,
    MetricsModule,
  ],
  providers: [MetricsWorker, ConnectionSyncWorker],
})
export class SyncModule {}
