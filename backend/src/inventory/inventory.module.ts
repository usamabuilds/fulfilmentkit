import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [PrismaService, InventoryService],
})
export class InventoryModule {}
