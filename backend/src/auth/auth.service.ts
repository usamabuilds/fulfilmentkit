import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../common/prisma/prisma.service';
import { getAuthRuntimeConfig } from '../config/env.validation';
// Runtime import required for Nest DI metadata (do not convert to `import type`).
import {
  NotificationsService,
  VerificationDeliveryError,
} from '../notifications/notifications.service';

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const RESEND_CODE_COOLDOWN_MS = 60_000;

type AuthUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
};

function hashPassword(password: string, salt: string): string {
  return createHash('sha256')
    .update(salt + password)
    .digest('hex');
}

function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function toSelectedPlan(plan: string | undefined): string | undefined {
  if (!plan) return undefined;

  const normalized = plan.trim().toUpperCase();

  if (normalized === 'STARTER') return 'STARTER';
  if (normalized === 'PRO') return 'PRO';
  if (normalized === 'ENTERPRISE') return 'ENTERPRISE';

  return undefined;
}

function getNextOnboardingStep(user: Pick<AuthUser, 'emailVerified' | 'onboardingCompleted'>):
  | 'verify-email'
  | 'complete-onboarding'
  | null {
  if (!user.emailVerified) return 'verify-email';
  if (!user.onboardingCompleted) return 'complete-onboarding';
  return null;
}

@Injectable()
export class AuthService {
  private readonly prisma: PrismaService;
  private readonly notificationsService: NotificationsService;

  constructor(
    prisma: PrismaService,
    // Must stay a concrete injected class to preserve Nest runtime metadata.
    notificationsService?: NotificationsService,
  ) {
    this.prisma = prisma;
    this.notificationsService = notificationsService as NotificationsService;
  }

  async register(params: { email: string; password: string; plan?: string }) {
    const email = params.email.trim().toLowerCase();

    const existingUser = await (this.prisma as any).user.findFirst({
      where: {
        email,
        authProvider: 'local',
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const salt = generateSalt();
    const hash = hashPassword(params.password, salt);
    const passwordHash = `${salt}:${hash}`;

    const selectedPlan = toSelectedPlan(params.plan);

    const user = await (this.prisma as any).user.create({
      data: {
        email,
        authProvider: 'local',
        authProviderUserId: email,
      },
      select: {
        id: true,
      },
    });

    const updatedUser = await (this.prisma as any).user.update({
      where: { id: user.id },
      data: {
        authProviderUserId: user.id,
        passwordHash,
        selectedPlan,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    const code = generateVerificationCode();
    await this.storeVerificationCode({ userId: updatedUser.id, code });
    await this.sendVerificationCodeOrThrow(email, code);

    return {
      verificationRequired: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        onboardingCompleted: updatedUser.onboardingCompleted,
        nextOnboardingStep: getNextOnboardingStep(updatedUser),
      },
    };
  }

  async verifyEmail(params: { email: string; code: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await (this.prisma as any).user.findFirst({
      where: {
        email,
        authProvider: 'local',
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const verificationRecord = await (this.prisma as any).emailVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        codeHash: true,
        expiresAt: true,
      },
    });

    const candidateHash = hashVerificationCode(params.code);
    const now = new Date();

    if (!verificationRecord || verificationRecord.codeHash !== candidateHash || verificationRecord.expiresAt <= now) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await (this.prisma as any).$transaction([
      (this.prisma as any).emailVerificationCode.deleteMany({ where: { userId: user.id } }),
      (this.prisma as any).user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
        },
      }),
    ]);

    const verifiedUser = await (this.prisma as any).user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    return this.toAuthResponse(verifiedUser);
  }

  async resendVerificationCode(params: { email: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await (this.prisma as any).user.findFirst({
      where: {
        email,
        authProvider: 'local',
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const latest = await (this.prisma as any).emailVerificationCode.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_CODE_COOLDOWN_MS) {
      throw new HttpException(
        'Please wait 60 seconds before requesting a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = generateVerificationCode();
    await this.storeVerificationCode({ userId: user.id, code });
    await this.sendVerificationCodeOrThrow(email, code);

    return {
      userId: user.id,
      email: user.email,
      verificationRequired: true,
      resent: true,
    };
  }

  async login(params: { email: string; password: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await (this.prisma as any).user.findFirst({
      where: {
        email,
        authProvider: 'local',
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        onboardingCompleted: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, hash] = user.passwordHash.split(':');
    const passwordMatches = salt ? hashPassword(params.password, salt) === hash : false;

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({
        message: 'Email address is not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return this.toAuthResponse(user);
  }

  private async sendVerificationCodeOrThrow(email: string, code: string): Promise<void> {
    try {
      await this.notificationsService.sendVerificationCode(email, code);
    } catch (error) {
      if (error instanceof VerificationDeliveryError) {
        throw new ServiceUnavailableException('Failed to deliver verification code');
      }

      throw error;
    }
  }

  private async storeVerificationCode(params: { userId: string; code: string }) {
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60_000);
    const codeHash = hashVerificationCode(params.code);

    await (this.prisma as any).$transaction([
      (this.prisma as any).emailVerificationCode.deleteMany({
        where: { userId: params.userId },
      }),
      (this.prisma as any).emailVerificationCode.create({
        data: {
          userId: params.userId,
          code: params.code,
          codeHash,
          expiresAt,
          lastSentAt: new Date(),
        },
      }),
    ]);
  }

  private toAuthResponse(user: AuthUser) {
    const authConfig = getAuthRuntimeConfig(process.env);

    if (!authConfig.local) {
      throw new Error(
        `Local token signing is disabled for AUTH_MODE=${authConfig.mode}. Enable AUTH_MODE=local or AUTH_MODE=hybrid to sign local tokens.`,
      );
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email ?? undefined,
        provider: 'local',
        iss: authConfig.local.issuer,
      },
      authConfig.local.secret,
      { expiresIn: '7d' },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        nextOnboardingStep: getNextOnboardingStep(user),
      },
    };
  }
}
