import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { WorkspacesService } from './workspaces.service';
import { validateQuery } from '../common/utils/query-validate';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
});

// Dummy user until auth is plugged in
const DUMMY_USER_ID = 'demo-user-1';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  async list() {
    const items = await this.workspaces.listWorkspacesForUser(DUMMY_USER_ID);

    return {
      items,
      total: items.length,
    };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const workspace = await this.workspaces.getWorkspaceForUser(id, DUMMY_USER_ID);
    return workspace;
  }

  @Post()
  async create(@Body() body: any) {
    const validated = validateQuery(CreateWorkspaceSchema, body);

    const workspace = await this.workspaces.createWorkspace({
      name: validated.name,
      creatorUserId: DUMMY_USER_ID,
    });

    return workspace;
  }
}
