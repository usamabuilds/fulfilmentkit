import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ListDemoController } from './common/list-demo.controller';
import { MeController } from './common/me.controller';
import { PrismaService } from './common/prisma/prisma.service';
import { WorkspaceGuard } from './common/guards/workspace.guard';
import { RolesGuard } from './common/auth/roles.guard';

import { WorkspacesModule } from './workspaces/workspaces.module';
import { CatalogModule } from './catalog/catalog.module';
import { LocationsModule } from './locations/locations.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SyncModule } from './sync/sync.module';
import { ConnectionsModule } from './connections/connections.module';
import { AiModule } from './ai/ai.module';
import { ForecastModule } from './forecast/forecast.module';
import { PlanningModule } from './planning/planning.module';

import { JwtAuthMiddleware } from './common/auth/jwt-auth.middleware';

@Module({
  imports: [
    WorkspacesModule,
    CatalogModule,
    LocationsModule,
    InventoryModule,
    OrdersModule,
    DashboardModule,
    SyncModule,
    ConnectionsModule,
    AiModule,
    ForecastModule,
    PlanningModule,
  ],
  controllers: [ListDemoController, MeController],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: WorkspaceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
  }
}
