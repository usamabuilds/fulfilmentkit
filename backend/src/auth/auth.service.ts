import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../common/prisma/prisma.service';
import { getAuthRuntimeConfig } from '../config/env.validation';

const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const RESEND_CODE_COOLDOWN_MS = 60_000;

interface VerificationMailService {
  sendVerificationCode(params: { email: string; code: string }): Promise<void>;
}

class ConsoleVerificationMailService implements VerificationMailService {
  async sendVerificationCode(params: { email: string; code: string }): Promise<void> {
    // Replace this implementation with your ESP provider adapter.
    console.info(
      `Verification code for ${params.email}: ${params.code}`,
    );
  }
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(salt + password).digest('hex');
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

@Injectable()
export class AuthService {
  private readonly verificationMailService: VerificationMailService;

  constructor(private readonly prisma: PrismaService) {
    this.verificationMailService = new ConsoleVerificationMailService();
  }

  async register(params: { email: string; password: string; plan?: string }) {
    const email = params.email.trim().toLowerCase();

    await this.ensureEmailVerificationTable();

    const existingUser = await this.prisma.user.findFirst({
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
      Prisma.sql`UPDATE "User" SET "passwordHash" = ${passwordHash} WHERE "id" = ${user.id}`,
    );

    const code = generateVerificationCode();
    await this.storeVerificationCode({ userId: user.id, email, code });
    await this.verificationMailService.sendVerificationCode({ email, code });

    return {
      userId: user.id,
      email: user.email,
      verificationRequired: true,
      plan: params.plan,
    };
  }

  async verifyEmail(params: { email: string; code: string }) {
    const email = params.email.trim().toLowerCase();
    await this.ensureEmailVerificationTable();

    const user = await this.prisma.user.findFirst({
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
      throw new UnauthorizedException('Invalid verification code');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string; codeHash: string; expiresAt: Date }>
    >(Prisma.sql`
      SELECT "id", "codeHash", "expiresAt"
      FROM "EmailVerificationCode"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    const record = rows[0];
    const candidateHash = hashVerificationCode(params.code);
    const now = new Date();

    if (!record || record.codeHash !== candidateHash || record.expiresAt <= now) {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`DELETE FROM "EmailVerificationCode" WHERE "userId" = ${user.id}`,
    );

    return this.toAuthResponse(user);
  }

  async resendVerificationCode(params: { email: string }) {
    const email = params.email.trim().toLowerCase();
    await this.ensureEmailVerificationTable();

    const user = await this.prisma.user.findFirst({
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

    const latestRows = await this.prisma.$queryRaw<Array<{ createdAt: Date }>>(Prisma.sql`
      SELECT "createdAt"
      FROM "EmailVerificationCode"
      WHERE "userId" = ${user.id}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    const latest = latestRows[0];
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_CODE_COOLDOWN_MS) {
      throw new HttpException('Please wait 60 seconds before requesting a new code', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = generateVerificationCode();
    await this.storeVerificationCode({ userId: user.id, email, code });
    await this.verificationMailService.sendVerificationCode({ email, code });

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
      throw new UnauthorizedException('Invalid credentials');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ passwordHash: string | null; emailVerifiedAt: Date | null }>
    >(
      Prisma.sql`SELECT "passwordHash", "emailVerifiedAt" FROM "User" WHERE "id" = ${user.id} LIMIT 1`,
    );

    const passwordHash = rows[0]?.passwordHash;
    const emailVerifiedAt = rows[0]?.emailVerifiedAt;

    if (!passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, hash] = passwordHash.split(':');
    const passwordMatches = salt ? hashPassword(params.password, salt) === hash : false;

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!emailVerifiedAt) {
      throw new ForbiddenException({
        message: 'Email address is not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return this.toAuthResponse({ id: user.id, email: user.email });
  }

  private async storeVerificationCode(params: {
    userId: string;
    email: string;
    code: string;
  }) {
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60_000);
    const codeHash = hashVerificationCode(params.code);

    await this.prisma.$transaction([
      this.prisma.$executeRaw(
        Prisma.sql`DELETE FROM "EmailVerificationCode" WHERE "userId" = ${params.userId} OR "email" = ${params.email}`,
      ),
      this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "EmailVerificationCode" (
            "id", "userId", "email", "codeHash", "expiresAt", "createdAt", "updatedAt"
          ) VALUES (
            ${randomUUID()}, ${params.userId}, ${params.email}, ${codeHash}, ${expiresAt}, NOW(), NOW()
          )
        `,
      ),
    ]);
  }

  private async ensureEmailVerificationTable() {
    await this.prisma.$executeRaw(
      Prisma.sql`
        CREATE TABLE IF NOT EXISTS "EmailVerificationCode" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "codeHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `,
    );

    await this.prisma.$executeRaw(
      Prisma.sql`CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId")`,
    );
    await this.prisma.$executeRaw(
      Prisma.sql`CREATE INDEX IF NOT EXISTS "EmailVerificationCode_email_idx" ON "EmailVerificationCode"("email")`,
    );
  }

  private toAuthResponse(user: { id: string; email: string | null }) {
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
      },
    };
  }
}
