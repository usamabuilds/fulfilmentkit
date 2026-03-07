import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiToolsetService } from './ai-toolset.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, AiToolsetService],
  exports: [AiService, AiToolsetService], // ✅ REQUIRED for PlanningModule
})
export class AiModule {}
