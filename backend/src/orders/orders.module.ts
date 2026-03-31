import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FinanceReportsService } from '../reports/finance/finance-reports.service';
import { FulfillmentReportsService } from '../reports/fulfillment/fulfillment-reports.service';
import { InventoryReportsService } from '../reports/inventory/inventory-reports.service';
import { OrdersTransactionalReportsService } from '../reports/orders/orders-transactional-reports.service';
import { OrdersController } from './orders.controller';
import { OrdersReportsController } from './reporting/orders-reports.controller';
import { OrdersReportsService } from './reporting/orders-reports.service';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController, OrdersReportsController],
  providers: [
    PrismaService,
    OrdersService,
    OrdersReportsService,
    OrdersTransactionalReportsService,
    FulfillmentReportsService,
    InventoryReportsService,
    FinanceReportsService,
  ],
})
export class OrdersModule {}
