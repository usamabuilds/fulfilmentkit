import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { WorkspaceRole } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { RolesService } from '../roles/roles.service';

type InviteMemberArgs = {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  roleDefinitionId?: string;
};

type UpdateMemberRoleArgs = {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
  roleDefinitionId?: string;
};

type RemoveMemberArgs = {
  workspaceId: string;
  userId: string;
  actingUserId?: string;
};

type UpdateWorkspaceSettingsArgs = {
  name: string;
  timezone?: string;
  locale?: string;
  defaultCurrency?: string;
  planningCadence?: 'weekly' | 'biweekly' | 'monthly';
  actingUserId?: string;
};

type RoleDefinitionRow = {
  id: string;
  name: string;
  permissions: unknown;
  legacyRole: WorkspaceRole | null;
};

type MemberRoleUpdateRow = {
  userId: string;
  email: string;
  role: WorkspaceRole;
  roleDefinitionId: string | null;
  roleName: string | null;
  permissions: unknown;
  joinedAt: Date;
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  private async resolveRoleDefinition(args: {
    workspaceId: string;
    role?: WorkspaceRole;
    roleDefinitionId?: string;
  }) {
    await this.rolesService.ensureDefaultRoleDefinitions(args.workspaceId);

    if (args.roleDefinitionId) {
      const rows = await this.prisma.$queryRaw<RoleDefinitionRow[]>`
        SELECT "id", "name", "permissions", "legacyRole"
        FROM "WorkspaceRoleDefinition"
        WHERE "id" = ${args.roleDefinitionId} AND "workspaceId" = ${args.workspaceId}
        LIMIT 1
      `;

      if (!rows[0]) {
        throw new NotFoundException('Role definition not found');
      }

      return {
        roleDefinitionId: rows[0].id,
        role: rows[0].legacyRole ?? args.role ?? WorkspaceRole.VIEWER,
      };
    }

    const selectedRole = args.role ?? WorkspaceRole.VIEWER;
    const rows = await this.prisma.$queryRaw<RoleDefinitionRow[]>`
      SELECT "id", "name", "permissions", "legacyRole"
      FROM "WorkspaceRoleDefinition"
      WHERE "workspaceId" = ${args.workspaceId} AND "legacyRole" = ${selectedRole}
      LIMIT 1
    `;

    return {
      roleDefinitionId: rows[0]?.id,
      role: selectedRole,
    };
  }

  async getWorkspaceSettings(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async updateWorkspaceSettings(workspaceId: string, input: UpdateWorkspaceSettingsArgs) {
    const result = await this.prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const workspace = await tx.workspace.update({
        where: { id: workspaceId },
        data: { name: input.name },
        select: { id: true, name: true, createdAt: true, updatedAt: true },
      });

      let userPreferences: {
        timezone: string | null;
        locale: string | null;
        defaultCurrency: string | null;
        planningCadence: string | null;
      } | null = null;

      if (input.actingUserId) {
        userPreferences = await txAny.user.update({
          where: { id: input.actingUserId },
          data: {
            timezone: input.timezone,
            locale: input.locale,
            defaultCurrency: input.defaultCurrency,
            planningCadence: input.planningCadence,
          },
          select: {
            timezone: true,
            locale: true,
            defaultCurrency: true,
            planningCadence: true,
          },
        });
      }

      return {
        ...workspace,
        timezone: userPreferences?.timezone ?? null,
        locale: userPreferences?.locale ?? null,
        defaultCurrency: userPreferences?.defaultCurrency ?? null,
        planningCadence: userPreferences?.planningCadence ?? null,
      };
    });

    return result;
  }

  async listWorkspaceMembers(workspaceId: string) {
    await this.rolesService.ensureDefaultRoleDefinitions(workspaceId);

    const rows = await this.prisma.$queryRaw<
      Array<{
        userId: string;
        email: string;
        role: WorkspaceRole;
        roleDefinitionId: string | null;
        roleName: string | null;
        permissions: unknown;
        joinedAt: Date;
      }>
    >`
      SELECT
        wm."userId",
        u."email",
        wm."role",
        wm."roleDefinitionId",
        rd."name" AS "roleName",
        rd."permissions" AS "permissions",
        wm."createdAt" AS "joinedAt"
      FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u."id" = wm."userId"
      LEFT JOIN "WorkspaceRoleDefinition" rd ON rd."id" = wm."roleDefinitionId"
      WHERE wm."workspaceId" = ${workspaceId}
      ORDER BY wm."createdAt" ASC
    `;

    return rows.map((member) => ({
      userId: member.userId,
      email: member.email,
      role: member.role,
      roleDefinitionId: member.roleDefinitionId,
      roleName: member.roleName ?? member.role,
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
      joinedAt: member.joinedAt,
    }));
  }

  async inviteMember(args: InviteMemberArgs) {
    const resolvedRole = await this.resolveRoleDefinition(args);
    const normalizedEmail = args.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    const user =
      existingUser ||
      (await this.prisma.user.create({
        data: {
          authProvider: 'invited',
          authProviderUserId: normalizedEmail,
          email: normalizedEmail,
        },
        select: { id: true },
      }));

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: args.workspaceId,
          userId: user.id,
        },
      },
      select: { userId: true },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const membership = await this.prisma.workspaceMember.create({
      data: {
        workspaceId: args.workspaceId,
        userId: user.id,
        role: resolvedRole.role,
      },
      select: {
        userId: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (resolvedRole.roleDefinitionId) {
      await this.prisma.$executeRaw`
        UPDATE "WorkspaceMember"
        SET "roleDefinitionId" = ${resolvedRole.roleDefinitionId}
        WHERE "workspaceId" = ${args.workspaceId} AND "userId" = ${user.id}
      `;
    }

    const roleRows = resolvedRole.roleDefinitionId
      ? await this.prisma.$queryRaw<RoleDefinitionRow[]>`
          SELECT "id", "name", "permissions", "legacyRole"
          FROM "WorkspaceRoleDefinition"
          WHERE "id" = ${resolvedRole.roleDefinitionId}
          LIMIT 1
        `
      : [];

    return {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
      roleDefinitionId: roleRows[0]?.id ?? null,
      roleName: roleRows[0]?.name ?? membership.role,
      permissions: Array.isArray(roleRows[0]?.permissions) ? roleRows[0].permissions : [],
      joinedAt: membership.createdAt,
    };
  }

  async updateMemberRole(args: UpdateMemberRoleArgs) {
    const resolvedRole = await this.resolveRoleDefinition(args);

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: args.workspaceId,
          userId: args.userId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this workspace');
    }

    const updatedRows = await this.prisma.$queryRaw<MemberRoleUpdateRow[]>`
      UPDATE "WorkspaceMember" wm
      SET
        "role" = ${resolvedRole.role}::"WorkspaceRole",
        "roleDefinitionId" = ${resolvedRole.roleDefinitionId ?? null}
      FROM "User" u
      LEFT JOIN "WorkspaceRoleDefinition" rd ON rd."id" = ${resolvedRole.roleDefinitionId ?? null}
      WHERE
        wm."workspaceId" = ${args.workspaceId}
        AND wm."userId" = ${args.userId}
        AND u."id" = wm."userId"
      RETURNING
        wm."userId" AS "userId",
        u."email" AS "email",
        wm."role" AS "role",
        wm."roleDefinitionId" AS "roleDefinitionId",
        rd."name" AS "roleName",
        rd."permissions" AS "permissions",
        wm."createdAt" AS "joinedAt"
    `;

    const updated = updatedRows[0];

    if (!updated) {
      throw new NotFoundException('Member not found in this workspace');
    }

    return {
      userId: updated.userId,
      email: updated.email,
      role: updated.role,
      roleDefinitionId: updated.roleDefinitionId,
      roleName: updated.roleName ?? updated.role,
      permissions: Array.isArray(updated.permissions) ? updated.permissions : [],
      joinedAt: updated.joinedAt,
    };
  }

  async removeMember(args: RemoveMemberArgs) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: args.workspaceId,
          userId: args.userId,
        },
      },
      select: {
        userId: true,
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this workspace');
    }

    const ownerCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId: args.workspaceId,
        role: 'OWNER',
      },
    });

    if (membership.role === 'OWNER' && ownerCount <= 1) {
      throw new ForbiddenException('Cannot remove the last OWNER from workspace');
    }

    if (args.actingUserId && args.actingUserId === args.userId && membership.role === 'OWNER') {
      throw new ForbiddenException('OWNER cannot remove self');
    }

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: args.workspaceId,
          userId: args.userId,
        },
      },
    });

    return { removed: true };
  }
}
