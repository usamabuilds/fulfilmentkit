import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { apiResponse } from './utils/api-response';

type NextOnboardingStep = 'verify-email' | 'complete-onboarding' | null;

type MeUserDto = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  nextOnboardingStep: NextOnboardingStep;
};

type MeRequest = {
  user?: {
    id?: string;
    email?: string;
  };
  workspaceId?: string;
  workspaceRole?: string;
};

function getNextOnboardingStep(user: Pick<MeUserDto, 'emailVerified' | 'onboardingCompleted'>): NextOnboardingStep {
  if (!user.emailVerified) return 'verify-email';
  if (!user.onboardingCompleted) return 'complete-onboarding';
  return null;
}

@Controller()
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async getMe(@Req() req: MeRequest) {
    const workspaceId = req.workspaceId ?? null;
    const workspaceRole = req.workspaceRole ?? null;

    const authUserId = req.user?.id;

    let user: MeUserDto | null = null;

    if (authUserId) {
      const dbUser = await (this.prisma as any).user.findUnique({
        where: { id: authUserId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          onboardingCompleted: true,
        },
      });

      if (dbUser) {
        user = {
          ...dbUser,
          nextOnboardingStep: getNextOnboardingStep(dbUser),
        };
      }
    }

    return apiResponse({
      user,
      workspaceId,
      workspaceRole,
    });
  }

  @Post('onboarding/complete')
  async completeOnboarding(@Req() req: MeRequest, @Body() _body: unknown) {
    const authUserId = req.user?.id;

    if (!authUserId) {
      return apiResponse({ updated: false });
    }

    const updatedUser = await (this.prisma as any).user.update({
      where: { id: authUserId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    return apiResponse({
      updated: true,
      user: {
        ...updatedUser,
        nextOnboardingStep: getNextOnboardingStep(updatedUser),
      },
    });
  }
}
