import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { getAuthRuntimeConfig } from '../config/env.validation';
import {
  NotificationsService,
  VerificationDeliveryError,
} from '../notifications/notifications.service';

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const RESEND_CODE_COOLDOWN_MS = 60_000;

type NextOnboardingStep = 'verify-email' | 'complete-onboarding' | null;
type SelectedPlan = 'STARTER' | 'PRO' | 'ENTERPRISE';

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

function normalizeSelectedPlan(plan?: string): SelectedPlan | null {
  if (!plan) return null;
  const normalized = plan.trim().toUpperCase();

  if (normalized === 'STARTER' || normalized === 'PRO' || normalized === 'ENTERPRISE') {
    return normalized;
  }

  return null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: Pick<NotificationsService, 'sendVerificationCode'> = {
      sendVerificationCode: async () => undefined,
    },
  ) {}

  async register(params: { email: string; password: string; plan?: string }) {
    const email = params.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email, authProvider: 'local' },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const salt = generateSalt();
    const hash = hashPassword(params.password, salt);
    const passwordHash = `${salt}:${hash}`;
    const selectedPlan = normalizeSelectedPlan(params.plan);
    const userId = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email,
        authProvider: 'local',
        authProviderUserId: userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE "User"
        SET
          "passwordHash" = ${passwordHash},
          "emailVerified" = false,
          "onboardingCompleted" = false,
          "selectedPlan" = ${selectedPlan}::"SelectedPlan"
        WHERE "id" = ${user.id}
      `,
    );

    const code = generateVerificationCode();
    await this.storeVerificationCode({ userId: user.id, code });
    await this.sendVerificationCodeOrThrow(email, code);

    return {
      userId: user.id,
      email: user.email,
      verificationRequired: true,
      plan: selectedPlan,
      emailVerified: false,
      onboardingCompleted: false,
      nextOnboardingStep: 'verify-email' as const,
    };
  }

  async verifyEmail(params: { email: string; code: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email, authProvider: 'local' },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const recordRows = await this.prisma.$queryRaw<
      Array<{ codeHash: string; expiresAt: Date }>
    >(Prisma.sql`
      SELECT "codeHash", "expiresAt"
      FROM "EmailVerificationCode"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    const record = recordRows[0];
    const candidateHash = hashVerificationCode(params.code);
    const now = new Date();

    if (!record || record.codeHash !== candidateHash || record.expiresAt <= now) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.$transaction([
      this.prisma.$executeRaw(
        Prisma.sql`DELETE FROM "EmailVerificationCode" WHERE "userId" = ${user.id}`,
      ),
      this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "emailVerified" = true, "emailVerifiedAt" = ${now}
          WHERE "id" = ${user.id}
        `,
      ),
    ]);

    return this.toAuthResponse({ id: user.id, email: user.email });
  }

  async resendVerificationCode(params: { email: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email, authProvider: 'local' },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const latestRows = await this.prisma.$queryRaw<Array<{ createdAt: Date }>>(Prisma.sql`
      SELECT "createdAt"
      FROM "EmailVerificationCode"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    const latest = latestRows[0];
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

    const user = await this.prisma.user.findFirst({
      where: { email, authProvider: 'local' },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userRows = await this.prisma.$queryRaw<
      Array<{
        passwordHash: string | null;
        emailVerified: boolean;
        onboardingCompleted: boolean;
      }>
    >(Prisma.sql`
      SELECT
        "passwordHash",
        COALESCE("emailVerified", false) AS "emailVerified",
        COALESCE("onboardingCompleted", false) AS "onboardingCompleted"
      FROM "User"
      WHERE "id" = ${user.id}
      LIMIT 1
    `);

    const userRow = userRows[0];

    if (!userRow?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, hash] = userRow.passwordHash.split(':');
    const passwordMatches = salt ? hashPassword(params.password, salt) === hash : false;

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!userRow.emailVerified) {
      throw new ForbiddenException({
        message: 'Email address is not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return this.toAuthResponse({ id: user.id, email: user.email });
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

    await this.prisma.$transaction([
      this.prisma.$executeRaw(
        Prisma.sql`DELETE FROM "EmailVerificationCode" WHERE "userId" = ${params.userId}`,
      ),
      this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "EmailVerificationCode"
            ("id", "userId", "codeHash", "expiresAt", "attemptCount", "lastSentAt", "createdAt")
          VALUES
            (${randomUUID()}, ${params.userId}, ${codeHash}, ${expiresAt}, 0, NOW(), NOW())
        `,
      ),
    ]);
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

  private async toAuthResponse(user: { id: string; email: string | null }) {
    const authConfig = getAuthRuntimeConfig(process.env);

    if (!authConfig.local) {
      throw new Error(
        `Local token signing is disabled for AUTH_MODE=${authConfig.mode}. Enable AUTH_MODE=local or AUTH_MODE=hybrid to sign local tokens.`,
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ emailVerified: boolean; onboardingCompleted: boolean }>
    >(Prisma.sql`
      SELECT
        COALESCE("emailVerified", false) AS "emailVerified",
        COALESCE("onboardingCompleted", false) AS "onboardingCompleted"
      FROM "User"
      WHERE "id" = ${user.id}
      LIMIT 1
    `);

    const profile = rows[0] ?? { emailVerified: false, onboardingCompleted: false };

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
        emailVerified: profile.emailVerified,
        onboardingCompleted: profile.onboardingCompleted,
        nextOnboardingStep: this.resolveNextOnboardingStep(profile),
      },
    };
  }
}
