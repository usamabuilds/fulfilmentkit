import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceRole } from '../generated/prisma';

type InviteMemberArgs = {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
};

type UpdateMemberRoleArgs = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

type RemoveMemberArgs = {
  workspaceId: string;
  userId: string;
  actingUserId?: string;
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async updateWorkspaceSettings(workspaceId: string, input: { name: string }) {
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: input.name,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return workspace;
  }

  async listWorkspaceMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'asc' }],
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

    return members.map((member) => ({
      userId: member.userId,
      email: member.user.email,
      role: member.role,
      joinedAt: member.createdAt,
    }));
  }

  async inviteMember(args: InviteMemberArgs) {
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
        role: args.role,
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

    return {
      userId: membership.userId,
      email: membership.user.email,
      role: membership.role,
      joinedAt: membership.createdAt,
    };
  }

  async updateMemberRole(args: UpdateMemberRoleArgs) {
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

    const updated = await this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: args.workspaceId,
          userId: args.userId,
        },
      },
      data: {
        role: args.role,
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

    return {
      userId: updated.userId,
      email: updated.user.email,
      role: updated.role,
      joinedAt: updated.createdAt,
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
