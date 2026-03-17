import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../common/auth/roles.decorator';
import { apiResponse } from '../common/utils/api-response';
import { SettingsService } from './settings.service';
import { WorkspaceRole } from '../generated/prisma';

const InviteMemberBodySchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  role: z.nativeEnum(WorkspaceRole).optional().default(WorkspaceRole.VIEWER),
  roleDefinitionId: z.string().uuid().optional(),
});

const UpdateMemberRoleBodySchema = z.object({
  role: z.nativeEnum(WorkspaceRole).optional(),
  roleDefinitionId: z.string().uuid().optional(),
}).refine((value) => value.role !== undefined || value.roleDefinitionId !== undefined, {
  message: 'role or roleDefinitionId is required',
});

@Controller('settings/members')
export class SettingsMembersController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async listMembers(@Req() req: any) {
    const workspaceId = req.workspaceId as string;
    const items = await this.settingsService.listWorkspaceMembers(workspaceId);
    return apiResponse({ items, total: items.length });
  }

  @Roles('ADMIN', 'OWNER')
  @Post('invite')
  async inviteMember(@Req() req: any, @Body() body: any) {
    const workspaceId = req.workspaceId as string;
    const parsed = InviteMemberBodySchema.parse(body);

    const result = await this.settingsService.inviteMember({
      workspaceId,
      email: parsed.email,
      role: parsed.role,
      roleDefinitionId: parsed.roleDefinitionId,
    });

    return apiResponse(result);
  }

  @Roles('OWNER')
  @Patch(':userId/role')
  async updateMemberRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    const workspaceId = req.workspaceId as string;
    const parsed = UpdateMemberRoleBodySchema.parse(body);

    const result = await this.settingsService.updateMemberRole({
      workspaceId,
      userId,
      role: parsed.role,
      roleDefinitionId: parsed.roleDefinitionId,
    });

    return apiResponse(result);
  }

  @Roles('OWNER')
  @Delete(':userId')
  async removeMember(@Req() req: any, @Param('userId') userId: string) {
    const workspaceId = req.workspaceId as string;
    const authUser = req.user as { id?: string } | undefined;

    const result = await this.settingsService.removeMember({
      workspaceId,
      userId,
      actingUserId: authUser?.id,
    });

    return apiResponse(result);
  }
}
