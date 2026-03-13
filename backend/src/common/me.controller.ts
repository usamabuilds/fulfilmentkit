import { Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from './prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { apiResponse } from './utils/api-response';

type NextOnboardingStep = 'verify-email' | 'complete-onboarding' | null;

type MeUserDto = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  nextOnboardingStep: NextOnboardingStep;
};

@Controller()
export class MeController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const workspaceId = typeof req.workspaceId === 'string' ? req.workspaceId : null;
    const authUser = req.user as { id?: string } | undefined;

    if (!authUser?.id) {
      return apiResponse({ user: null, workspaceId, workspaceRole: null });
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        email: string | null;
        emailVerified: boolean;
        onboardingCompleted: boolean;
      }>
    >(Prisma.sql`
      SELECT
        "id",
        "email",
        COALESCE("emailVerified", false) AS "emailVerified",
        COALESCE("onboardingCompleted", false) AS "onboardingCompleted"
      FROM "User"
      WHERE "id" = ${authUser.id}
      LIMIT 1
    `);

    const persistedUser = rows[0];

    if (!persistedUser) {
      return apiResponse({ user: null, workspaceId, workspaceRole: null });
    }

    const user: MeUserDto = {
      id: persistedUser.id,
      email: persistedUser.email,
      emailVerified: persistedUser.emailVerified,
      onboardingCompleted: persistedUser.onboardingCompleted,
      nextOnboardingStep: this.resolveNextOnboardingStep({
        emailVerified: persistedUser.emailVerified,
        onboardingCompleted: persistedUser.onboardingCompleted,
      }),
    };

    const workspaceRole = workspaceId
      ? await this.workspacesService.getWorkspaceRoleForUser(workspaceId, persistedUser.id)
      : null;

    return apiResponse({ user, workspaceId, workspaceRole });
  }

  @Post('onboarding/complete')
  async completeOnboarding(@Req() req: any) {
    const authUser = req.user as { id?: string } | undefined;

    if (!authUser?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const completedAt = new Date();

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET "onboardingCompleted" = true, "onboardingCompletedAt" = ${completedAt}
        WHERE "id" = ${authUser.id}
      `,
    );

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        email: string | null;
        emailVerified: boolean;
        onboardingCompleted: boolean;
      }>
    >(Prisma.sql`
      SELECT
        "id",
        "email",
        COALESCE("emailVerified", false) AS "emailVerified",
        COALESCE("onboardingCompleted", false) AS "onboardingCompleted"
      FROM "User"
      WHERE "id" = ${authUser.id}
      LIMIT 1
    `);

    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return apiResponse({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        nextOnboardingStep: this.resolveNextOnboardingStep({
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompleted,
        }),
      },
    });
  }

  private resolveNextOnboardingStep(params: {
    emailVerified: boolean;
    onboardingCompleted: boolean;
  }): NextOnboardingStep {
    if (!params.emailVerified) {
      return 'verify-email';
    }

    if (!params.onboardingCompleted) {
      return 'complete-onboarding';
    }

    return null;
  }
}
