import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { OrdersController } from './orders.controller';
import { OrdersReportsController } from './reporting/orders-reports.controller';
import { OrdersReportsService } from './reporting/orders-reports.service';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController, OrdersReportsController],
  providers: [PrismaService, OrdersService, OrdersReportsService],
})
export class OrdersModule {}
