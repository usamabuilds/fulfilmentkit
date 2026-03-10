import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsController } from './settings.controller';
import { SettingsMembersController } from './settings-members.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, SettingsMembersController],
  providers: [PrismaService, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
