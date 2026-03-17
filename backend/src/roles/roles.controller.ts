import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { Permissions } from '../common/auth/roles.decorator';
import { apiResponse } from '../common/utils/api-response';
import { RolesService } from './roles.service';
import { ALL_WORKSPACE_PERMISSIONS, WorkspacePermission } from './roles.constants';

const RolePermissionsEnum = z.enum(ALL_WORKSPACE_PERMISSIONS as [string, ...string[]]);

const CreateRoleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional().nullable(),
  permissions: z.array(RolePermissionsEnum).min(1),
});

const UpdateRoleSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  permissions: z.array(RolePermissionsEnum).min(1).optional(),
});

@Controller('settings/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Permissions('roles.manage')
  @Get()
  async listRoles(@Req() req: { workspaceId: string }) {
    const items = await this.rolesService.listRoles(req.workspaceId);
    return apiResponse({ items, total: items.length });
  }

  @Permissions('roles.manage')
  @Post()
  async createRole(@Req() req: { workspaceId: string }, @Body() body: unknown) {
    const parsed = CreateRoleSchema.parse(body);
    const role = await this.rolesService.createRole({
      workspaceId: req.workspaceId,
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions as WorkspacePermission[],
    });

    return apiResponse(role);
  }

  @Permissions('roles.manage')
  @Patch(':id')
  async updateRole(
    @Req() req: { workspaceId: string },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = UpdateRoleSchema.parse(body);
    const role = await this.rolesService.updateRole({
      workspaceId: req.workspaceId,
      roleDefinitionId: id,
      ...parsed,
      permissions: parsed.permissions as WorkspacePermission[] | undefined,
    });

    return apiResponse(role);
  }

  @Permissions('roles.manage')
  @Delete(':id')
  async deleteRole(@Req() req: { workspaceId: string }, @Param('id') id: string) {
    const result = await this.rolesService.deleteRole(req.workspaceId, id);
    return apiResponse(result);
  }
}
