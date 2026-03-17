import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController],
  providers: [PrismaService, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
