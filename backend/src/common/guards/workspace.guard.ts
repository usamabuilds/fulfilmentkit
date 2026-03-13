import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
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
  private readonly logger = new Logger(WorkspaceGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const method = request?.method;
    const path = (request?.originalUrl || request?.url || '').split('?')[0];
    const isWorkspaceBootstrapRoute = path === '/workspaces' && method === 'POST';
    const isAuthPublicRoute =
      (path === '/auth/register' ||
        path === '/auth/login' ||
        path === '/auth/verify-email' ||
        path === '/auth/resend-code' ||
        path === '/auth/resend-verification') &&
      method === 'POST';

    if (isWorkspaceBootstrapRoute || isAuthPublicRoute) {
      return true;
    }

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

    const auth: AuthShape | undefined = request.auth;

    const externalUserId: string | undefined = auth?.externalUserId || request?.user?.id;

    if (!externalUserId) {
      this.logger.warn('[WorkspaceGuard] no auth detected', {
        path: request?.originalUrl || request?.url,
        method,
        hasAuth: !!auth,
        hasUser: !!request?.user,
        isWorkspaceBootstrapRoute,
      });

      throw new UnauthorizedException('Authentication required');
    }

    const provider: string | undefined = auth?.provider;

    if (!provider) {
      throw new UnauthorizedException('Authentication provider missing');
    }

    const email: string | undefined = auth?.email || request?.user?.email;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        authProvider_authProviderUserId: {
          authProvider: provider,
          authProviderUserId: externalUserId,
        },
      },
      select: {
        id: true,
        authProvider: true,
        authProviderUserId: true,
      },
    });

    const user = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: email ?? undefined,
          },
          select: {
            id: true,
            authProvider: true,
            authProviderUserId: true,
            email: true,
          },
        })
      : await this.prisma.user.create({
          data: {
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

    this.logger.log('[WorkspaceGuard] enforcing membership', {
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

    this.logger.log('[WorkspaceGuard] role attached', {
      path: request?.originalUrl || request?.url,
      workspaceId,
      role: membership.role,
    });

    return true;
  }
}
