import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthShape = {
  provider?: string;
  externalUserId?: string;
  email?: string;
  tokenClaims?: any;
};

type ResolvedUser = {
  id: string;
  email: string | null;
  authProvider: string;
  authProviderUserId: string;
};

@Injectable()
export class WorkspaceGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const method = request?.method;
    const path = (request?.originalUrl || request?.url || '').split('?')[0];

    const isAuthPublicRoute = path.startsWith('/auth/');
    const isAccountRoute =
      (path === '/me' && method === 'GET') ||
      (path === '/onboarding/complete' && method === 'POST') ||
      (path === '/me/preferences' && (method === 'GET' || method === 'PATCH'));
    const isWorkspaceSelfServiceRoute =
      (path === '/workspaces' && (method === 'GET' || method === 'POST')) ||
      (method === 'GET' && /^\/workspaces\/[^/]+$/.test(path));
    const isShopifyOAuthCallbackRoute =
      path === '/connections/shopify/callback' && method === 'GET';
    const isXeroOAuthCallbackRoute = path === '/connections/xero/callback' && method === 'GET';

    if (
      isAuthPublicRoute ||
      isAccountRoute ||
      isWorkspaceSelfServiceRoute ||
      isShopifyOAuthCallbackRoute ||
      isXeroOAuthCallbackRoute
    ) {
      await this.resolveOrCreateUserFromAuth(request, {
        allowRequestUserFallback: false,
        requireIdentity: false,
      });

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

    const user = await this.resolveOrCreateUserFromAuth(request, {
      allowRequestUserFallback: true,
      requireIdentity: true,
    });

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
      select: {
        id: true,
        role: true,
        roleDefinitionId: true,
        roleDefinition: {
          select: {
            id: true,
            legacyRole: true,
            permissions: true,
          },
        },
      } as any,
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

  private async resolveOrCreateUserFromAuth(
    request: any,
    options: { allowRequestUserFallback: boolean; requireIdentity: true },
  ): Promise<ResolvedUser>;
  private async resolveOrCreateUserFromAuth(
    request: any,
    options: { allowRequestUserFallback: boolean; requireIdentity: false },
  ): Promise<ResolvedUser | null>;
  private async resolveOrCreateUserFromAuth(
    request: any,
    options: { allowRequestUserFallback: boolean; requireIdentity: boolean },
  ): Promise<ResolvedUser | null> {
    const auth: AuthShape | undefined = request.auth;
    const externalUserId: string | undefined =
      auth?.externalUserId || (options.allowRequestUserFallback ? request?.user?.id : undefined);
    const provider: string | undefined = auth?.provider;

    if (!externalUserId) {
      if (!options.requireIdentity) {
        return null;
      }

      this.logger.warn('[WorkspaceGuard] no auth detected', {
        path: request?.originalUrl || request?.url,
        method: request?.method,
        hasAuth: !!auth,
        hasUser: !!request?.user,
      });

      throw new UnauthorizedException('Authentication required');
    }

    if (!provider) {
      if (!options.requireIdentity) {
        return null;
      }

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
        email: true,
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

    return user;
  }
}
