import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [AiModule],
  controllers: [PlanningController],
  providers: [PlanningService, PrismaService],
  exports: [PlanningService],
})
export class PlanningModule {}
