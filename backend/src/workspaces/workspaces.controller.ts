import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { z } from 'zod';
import { WorkspacesService } from './workspaces.service';
import { validateQuery } from '../common/utils/query-validate';
import { toListResponse } from '../common/utils/list-response';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async list(@Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;
    const items = await this.workspaces.listWorkspacesForUser(authUser?.id as string);

    return toListResponse({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
    });
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;
    const workspace = await this.workspaces.getWorkspaceForUser(id, authUser?.id as string);
    return workspace;
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;
    const validated = validateQuery(CreateWorkspaceSchema, body);

    const workspace = await this.workspaces.createWorkspace({
      name: validated.name,
      creatorUserId: authUser?.id as string,
    });

    return workspace;
  }
}
