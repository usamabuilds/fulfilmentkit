import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../common/auth/roles.decorator';
import { apiResponse } from '../common/utils/api-response';
import { SettingsService } from './settings.service';

const UpdateSettingsBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).optional(),
  locale: z.string().trim().min(1).optional(),
  defaultCurrency: z.string().trim().min(1).optional(),
  planningCadence: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
}).strict();

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: any) {
    const workspaceId = req.workspaceId as string;
    const result = await this.settingsService.getWorkspaceSettings(workspaceId);
    return apiResponse(result);
  }

  @Roles('ADMIN', 'OWNER')
  @Patch()
  async patchSettings(@Req() req: any, @Body() body: any) {
    const workspaceId = req.workspaceId as string;
    const actingUserId = req.user?.id as string;
    const parsed = UpdateSettingsBodySchema.parse(body);

    const result = await this.settingsService.updateWorkspaceSettings(workspaceId, {
      name: parsed.name,
      timezone: parsed.timezone,
      locale: parsed.locale,
      defaultCurrency: parsed.defaultCurrency,
      planningCadence: parsed.planningCadence,
      actingUserId,
    });

    return apiResponse(result);
  }
}
