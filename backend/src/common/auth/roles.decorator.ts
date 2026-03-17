import { SetMetadata } from '@nestjs/common';
import type { WorkspaceRole } from './roles';
import type { WorkspacePermission } from '../../roles/roles.constants';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

export const Roles = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: WorkspacePermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
