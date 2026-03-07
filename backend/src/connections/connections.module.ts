import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { WebhookController } from './webhooks/webhook.controller';
import { WebhookService } from './webhooks/webhook.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'sync', // queue names MUST NOT contain colons
    }),
  ],
  controllers: [
    ConnectionsController,
    WebhookController, // 👈 added
  ],
  providers: [
    ConnectionsService,
    WebhookService, // 👈 added
  ],
})
export class ConnectionsModule {}
