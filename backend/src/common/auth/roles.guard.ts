import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import type { WorkspaceRole } from './roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();

    // Workspace must be present (WorkspaceGuard sets this)
    const workspaceId: string | undefined = req.workspaceId;
    if (!workspaceId) {
      throw new ForbiddenException('Workspace scope is missing');
    }

    // ✅ Option A: role must come from WorkspaceGuard -> WorkspaceMember
    const role: WorkspaceRole | undefined = req.workspaceRole as WorkspaceRole | undefined;

    if (!role) {
      // If endpoint requires roles but we have no workspaceRole,
      // it means either:
      // - user is not authenticated (req.user missing), or
      // - authenticated but not a member (WorkspaceGuard should have blocked), or
      // - membership exists but WorkspaceGuard didn't attach role (bug)
      throw new ForbiddenException('User role is missing');
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
