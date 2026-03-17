import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from './roles.decorator';
import type { WorkspaceRole } from './roles';
import {
  DEFAULT_ROLE_PERMISSIONS,
  WorkspacePermission,
} from '../../roles/roles.constants';

type RequestRoleDefinition = {
  id: string;
  legacyRole: WorkspaceRole | null;
  permissions: unknown;
};

type RequestMembership = {
  role: WorkspaceRole;
  roleDefinition?: RequestRoleDefinition | null;
};

function parsePermissions(value: unknown): WorkspacePermission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((permission): permission is WorkspacePermission => typeof permission === 'string');
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<WorkspacePermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    // Workspace must be present (WorkspaceGuard sets this)
    const workspaceId: string | undefined = req.workspaceId;
    if (!workspaceId) {
      throw new ForbiddenException('Workspace scope is missing');
    }

    // ✅ Option A: role must come from WorkspaceGuard -> WorkspaceMember
    const membership = req.workspaceMember as RequestMembership | undefined;
    const fallbackRole = req.workspaceRole as WorkspaceRole | undefined;
    const roleDefinition = membership?.roleDefinition;
    const role: WorkspaceRole | undefined =
      roleDefinition?.legacyRole ?? membership?.role ?? fallbackRole;

    if (!role) {
      throw new ForbiddenException('User role is missing');
    }

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }

    const grantedPermissions = new Set<WorkspacePermission>([
      ...DEFAULT_ROLE_PERMISSIONS[role],
      ...parsePermissions(roleDefinition?.permissions),
    ]);

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        grantedPermissions.has(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
