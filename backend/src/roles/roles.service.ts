import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkspaceRole } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ALL_WORKSPACE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  LEGACY_ROLE_NAMES,
  WorkspacePermission,
} from './roles.constants';

type CreateRoleInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  permissions: WorkspacePermission[];
};

type UpdateRoleInput = {
  workspaceId: string;
  roleDefinitionId: string;
  name?: string;
  description?: string | null;
  permissions?: WorkspacePermission[];
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: Prisma.JsonValue;
  isSystem: boolean;
  legacyRole: WorkspaceRole | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertPermissions(permissions: string[]): WorkspacePermission[] {
    const invalidPermission = permissions.find((permission) => !ALL_WORKSPACE_PERMISSIONS.includes(permission as WorkspacePermission));
    if (invalidPermission) throw new BadRequestException(`Unknown permission: ${invalidPermission}`);
    return [...new Set(permissions)] as WorkspacePermission[];
  }

  async ensureDefaultRoleDefinitions(workspaceId: string) {
    for (const role of Object.values(WorkspaceRole)) {
      const id = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "WorkspaceRoleDefinition"
        WHERE "workspaceId" = ${workspaceId} AND "legacyRole" = ${role}
        LIMIT 1
      `;

      if (id.length === 0) {
        await this.prisma.$executeRaw`
          INSERT INTO "WorkspaceRoleDefinition" ("id", "workspaceId", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::text,
            ${workspaceId},
            ${LEGACY_ROLE_NAMES[role]},
            ${`Default ${role.toLowerCase()} role`},
            ${JSON.stringify(DEFAULT_ROLE_PERMISSIONS[role])}::jsonb,
            true,
            ${role},
            NOW(),
            NOW()
          )
          ON CONFLICT ("workspaceId", "legacyRole") DO NOTHING
        `;
      }
    }
  }

  async listRoles(workspaceId: string) {
    await this.ensureDefaultRoleDefinitions(workspaceId);
    return this.prisma.$queryRaw<RoleRow[]>`
      SELECT "id", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt"
      FROM "WorkspaceRoleDefinition"
      WHERE "workspaceId" = ${workspaceId}
      ORDER BY "isSystem" DESC, "createdAt" ASC
    `;
  }

  async createRole(input: CreateRoleInput) {
    const permissions = this.assertPermissions(input.permissions);
    try {
      const created = await this.prisma.$queryRaw<RoleRow[]>`
        INSERT INTO "WorkspaceRoleDefinition" ("id", "workspaceId", "name", "description", "permissions", "isSystem", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${input.workspaceId}, ${input.name}, ${input.description ?? null}, ${JSON.stringify(permissions)}::jsonb, false, NOW(), NOW())
        RETURNING "id", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt"
      `;
      return created[0];
    } catch {
      throw new ConflictException('Role with this name already exists');
    }
  }

  async updateRole(input: UpdateRoleInput) {
    const existingRows = await this.prisma.$queryRaw<RoleRow[]>`
      SELECT "id", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt"
      FROM "WorkspaceRoleDefinition"
      WHERE "id" = ${input.roleDefinitionId} AND "workspaceId" = ${input.workspaceId}
      LIMIT 1
    `;

    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('Role definition not found');

    if (existing.isSystem && existing.legacyRole && input.name && input.name !== LEGACY_ROLE_NAMES[existing.legacyRole]) {
      throw new BadRequestException('Default roles are immutable and cannot be renamed');
    }

    const nextName = input.name ?? existing.name;
    const nextDescription = input.description !== undefined ? input.description : existing.description;
    const nextPermissions = input.permissions ? this.assertPermissions(input.permissions) : (existing.permissions as WorkspacePermission[]);

    try {
      const updated = await this.prisma.$queryRaw<RoleRow[]>`
        UPDATE "WorkspaceRoleDefinition"
        SET "name" = ${nextName},
            "description" = ${nextDescription},
            "permissions" = ${JSON.stringify(nextPermissions)}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${input.roleDefinitionId}
        RETURNING "id", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt"
      `;
      return updated[0];
    } catch {
      throw new ConflictException('Role with this name already exists');
    }
  }

  async deleteRole(workspaceId: string, roleDefinitionId: string) {
    const existingRows = await this.prisma.$queryRaw<RoleRow[]>`
      SELECT "id", "name", "description", "permissions", "isSystem", "legacyRole", "createdAt", "updatedAt"
      FROM "WorkspaceRoleDefinition"
      WHERE "id" = ${roleDefinitionId} AND "workspaceId" = ${workspaceId}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('Role definition not found');
    if (existing.isSystem || existing.legacyRole) throw new BadRequestException('Default roles cannot be deleted');

    const inUse = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "WorkspaceMember"
      WHERE "workspaceId" = ${workspaceId} AND "roleDefinitionId" = ${roleDefinitionId}
    `;

    if (Number(inUse[0]?.count ?? 0) > 0) {
      throw new ConflictException('Role is currently assigned to members');
    }

    await this.prisma.$executeRaw`
      DELETE FROM "WorkspaceRoleDefinition"
      WHERE "id" = ${roleDefinitionId}
    `;

    return { removed: true };
  }
}
