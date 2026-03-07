import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SkusController } from './skus.controller';
import { SkusService } from './skus.service';

@Module({
  controllers: [ProductsController, SkusController],
  providers: [ProductsService, SkusService, PrismaService],
})
export class CatalogModule {}
