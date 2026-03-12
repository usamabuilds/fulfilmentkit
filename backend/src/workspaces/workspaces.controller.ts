import { Body, Controller, Get, Param, Post, Req, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { WorkspacesService } from './workspaces.service';
import { validateQuery } from '../common/utils/query-validate';
import { toListResponse } from '../common/utils/list-response';
import { apiResponse } from '../common/utils/api-response';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async list(@Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;

    if (!authUser?.id) {
      throw new UnauthorizedException('Not authenticated');
    }

    const items = await this.workspaces.listWorkspacesForUser(authUser.id);

    return apiResponse(
      toListResponse({
        items,
        total: items.length,
        page: 1,
        pageSize: items.length,
      }),
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;
    const workspace = await this.workspaces.getWorkspaceForUser(id, authUser?.id as string);
    return apiResponse(workspace);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const schema = z.object({ name: z.string().min(1) });
    const { name } = schema.parse(body);
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const workspace = await this.workspaces.createWorkspace({
      name,
      creatorUserId: userId,
    });

    return apiResponse(workspace);
  }
}
