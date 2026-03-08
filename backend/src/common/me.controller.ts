import { Controller, Get, Req } from '@nestjs/common';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { apiResponse } from './utils/api-response';

type MeUserDto = {
  id: string;
  email: string | null;
};

@Controller()
export class MeController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  // GET /me
  // Workspace scoped (WorkspaceGuard requires X-Workspace-Id and sets req.workspaceId)
  // Option A: req.user.id is the Supabase user id
  @Get('me')
  async getMe(@Req() req: any) {
    const workspaceId: string = req.workspaceId;

    const authUser = req.user as { id?: string; email?: string } | undefined;

    let user: MeUserDto | null = null;
    let workspaceRole: string | null = null;

    if (authUser?.id) {
      user = {
        id: authUser.id,
        email: authUser.email ?? null,
      };

      workspaceRole = await this.workspacesService.getWorkspaceRoleForUser(
        workspaceId,
        authUser.id,
      );
    }

    return apiResponse({
        user,
        workspaceId,
        workspaceRole,
      });
  }
}
