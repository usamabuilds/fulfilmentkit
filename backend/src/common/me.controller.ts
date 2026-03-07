import { Controller, Get, Req } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type MeUserDto = {
  id: string;
  email: string | null;
};

@Controller()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

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

      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: authUser.id,
          },
        },
        select: { role: true },
      });

      workspaceRole = membership?.role ?? null;
    }

    return {
      success: true,
      data: {
        user,
        workspaceId,
        workspaceRole,
      },
    };
  }
}
