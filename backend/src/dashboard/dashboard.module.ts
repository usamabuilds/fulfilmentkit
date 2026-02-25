import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [PrismaService, DashboardService],
})
export class DashboardModule {}
