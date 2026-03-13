import {
  BadRequestException,
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

function hashPassword(password: string, salt: string): string {
  return createHash('sha256')
    .update(salt + password)
    .digest('hex');
}

function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(params: { email: string; password: string }) {
    const email = params.email.trim().toLowerCase();

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

    await this.sendVerificationCodeOrThrow(email);

    return this.toAuthResponse(user);
  }

  async resendVerificationCode(params: { email: string }) {
    const email = params.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        authProvider: 'local',
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.sendVerificationCodeOrThrow(email);

    return {
      success: true,
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

    const rows = await this.prisma.$queryRaw<Array<{ passwordHash: string | null }>>(
      Prisma.sql`SELECT "passwordHash" FROM "User" WHERE "id" = ${user.id} LIMIT 1`,
    );

    const passwordHash = rows[0]?.passwordHash;

    if (!passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const [salt, hash] = passwordHash.split(':');
    const passwordMatches = salt ? hashPassword(params.password, salt) === hash : false;

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toAuthResponse({ id: user.id, email: user.email });
  }

  private async sendVerificationCodeOrThrow(email: string): Promise<void> {
    const code = this.generateVerificationCode();

    try {
      await this.notificationsService.sendVerificationCode(email, code);
    } catch (error) {
      if (error instanceof VerificationDeliveryError) {
        throw new ServiceUnavailableException('Failed to deliver verification code');
      }

      throw error;
    }
  }

  private generateVerificationCode(): string {
    const code = randomInt(0, 1_000_000);
    return code.toString().padStart(6, '0');
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
