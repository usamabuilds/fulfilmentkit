import {
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from './prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { apiResponse } from './utils/api-response';

type MeUserDto = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  nextOnboardingStep: 'verify-email' | 'complete-onboarding' | null;
};

type RequestUser = {
  id?: string;
};

@Controller()
export class MeController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly prisma: PrismaService,
  ) {}

  private getNextOnboardingStep(user: {
    emailVerified: boolean;
    onboardingCompleted: boolean;
  }): 'verify-email' | 'complete-onboarding' | null {
    if (!user.emailVerified) {
      return 'verify-email';
    }

    if (!user.onboardingCompleted) {
      return 'complete-onboarding';
    }

    return null;
  }

  private async getUserWithOnboardingStatus(userId: string): Promise<MeUserDto | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        email: string | null;
        emailVerified: boolean | null;
        onboardingCompleted: boolean | null;
      }>
    >(
      Prisma.sql`SELECT "id", "email", "emailVerified", "onboardingCompleted" FROM "User" WHERE "id" = ${userId} LIMIT 1`,
    );

    const row = rows[0];

    if (!row) {
      return null;
    }

    const status = {
      emailVerified: row.emailVerified ?? false,
      onboardingCompleted: row.onboardingCompleted ?? false,
    };

    return {
      id: row.id,
      email: row.email,
      emailVerified: status.emailVerified,
      onboardingCompleted: status.onboardingCompleted,
      nextOnboardingStep: this.getNextOnboardingStep(status),
    };
  }

  @Get('me')
  async getMe(@Req() req: { workspaceId?: string; user?: RequestUser }) {
    const workspaceId = req.workspaceId ?? null;
    const authUser = req.user;

    let user: MeUserDto | null = null;
    let workspaceRole: string | null = null;

    if (authUser?.id) {
      user = await this.getUserWithOnboardingStatus(authUser.id);

      if (workspaceId) {
        workspaceRole = await this.workspacesService.getWorkspaceRoleForUser(
          workspaceId,
          authUser.id,
        );
      }
    }

    return apiResponse({
      user,
      workspaceId,
      workspaceRole,
    });
  }

  @Post('onboarding/complete')
  async completeOnboarding(@Req() req: { user?: RequestUser }) {
    const authUser = req.user;

    if (!authUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "User" SET "onboardingCompleted" = true, "onboardingCompletedAt" = NOW() WHERE "id" = ${authUser.id}`,
    );

    const updatedUser = await this.getUserWithOnboardingStatus(authUser.id);

    return apiResponse({
      user: updatedUser,
    });
  }
}
