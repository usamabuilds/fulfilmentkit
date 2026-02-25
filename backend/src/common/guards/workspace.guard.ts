import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthShape = {
  provider?: string;
  externalUserId?: string;
  email?: string;
  tokenClaims?: any;
};

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const workspaceId = request.headers['x-workspace-id'];

    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestException('X-Workspace-Id header is required');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    request.workspaceId = workspaceId;

    // --------------------------------------------------
    // RESOLVE AUTH IDENTITY (robust)
    // --------------------------------------------------

    const auth: AuthShape | undefined = request.auth;

    const externalUserId: string | undefined =
      auth?.externalUserId || request?.user?.id;

    if (!externalUserId) {
      console.log('[WorkspaceGuard] no auth detected', {
        path: request?.originalUrl || request?.url,
        hasAuth: !!auth,
        hasUser: !!request?.user,
      });
      return true;
    }

    // provider MUST be a string for Prisma
    const provider: string = auth?.provider || 'supabase';

    const email: string | undefined = auth?.email || request?.user?.email;

    // --------------------------------------------------
    // UPSERT USER (LOCKED RULE: User.id = external auth id)
    // --------------------------------------------------

    const user = await this.prisma.user.upsert({
      where: { id: externalUserId },
      update: {
        email: email ?? undefined,
        authProvider: provider,
        authProviderUserId: externalUserId,
      },
      create: {
        id: externalUserId,
        authProvider: provider,
        authProviderUserId: externalUserId,
        email: email ?? null,
      },
      select: {
        id: true,
        authProvider: true,
        authProviderUserId: true,
        email: true,
      },
    });

    request.user = {
      id: user.id,
      email: user.email,
      authProvider: user.authProvider,
      authProviderUserId: user.authProviderUserId,
    };

    console.log('[WorkspaceGuard] enforcing membership', {
      path: request?.originalUrl || request?.url,
      workspaceId,
      userId: user.id,
    });

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      select: { id: true, role: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    request.workspaceMember = membership;
    request.workspaceRole = membership.role;

    console.log('[WorkspaceGuard] role attached', {
      path: request?.originalUrl || request?.url,
      workspaceId,
      role: membership.role,
    });

    return true;
  }
}
