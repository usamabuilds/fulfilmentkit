import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(input: { name: string; creatorUserId: string }) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: input.name,
        members: {
          create: {
            userId: input.creatorUserId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return workspace;
  }

  async listWorkspacesForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
      },
      select: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return memberships.map((m) => m.workspace);
  }

  // Workspace detail with access control
  async getWorkspaceForUser(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access to workspace denied');
    }

    return workspace;
  }
}
