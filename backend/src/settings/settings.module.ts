import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SettingsController } from './settings.controller';
import { SettingsMembersController } from './settings-members.controller';
import { SettingsService } from './settings.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [RolesModule],
  controllers: [SettingsController, SettingsMembersController],
  providers: [PrismaService, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
