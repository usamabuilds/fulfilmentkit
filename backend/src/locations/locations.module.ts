import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController],
  providers: [PrismaService, LocationsService],
})
export class LocationsModule {}
