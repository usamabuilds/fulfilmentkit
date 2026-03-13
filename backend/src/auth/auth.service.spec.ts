import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function createAuthService(params: {
  user: { id: string; email: string | null } | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
}) {
  const prisma = {
    user: {
      findFirst: async () => params.user,
    },
    $queryRaw: async () => [
      {
        passwordHash: params.passwordHash,
        emailVerifiedAt: params.emailVerifiedAt,
      },
    ],
  };

  return new AuthService(prisma as any);
}

test('login throws UnauthorizedException for invalid credentials', async () => {
  const service = createAuthService({
    user: { id: 'user-1', email: 'demo@example.com' },
    passwordHash: 'salt:wrong-hash',
    emailVerifiedAt: new Date('2025-01-01T00:00:00.000Z'),
  });

  await assert.rejects(
    async () => service.login({ email: 'demo@example.com', password: 'correct-password' }),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      assert.equal(error.message, 'Invalid credentials');
      return true;
    },
  );
});

test('login throws ForbiddenException with EMAIL_NOT_VERIFIED for valid credentials on unverified user', async () => {
  const password = 'correct-password';
  const salt = 'salt';
  const hash = '00af266e5980b4c8f570c335920947d27402da0ac29b38f43233590523262348';
  const service = createAuthService({
    user: { id: 'user-1', email: 'demo@example.com' },
    passwordHash: `${salt}:${hash}`,
    emailVerifiedAt: null,
  });

  await assert.rejects(
    async () => service.login({ email: 'demo@example.com', password }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.deepEqual(error.getResponse(), {
        message: 'Email address is not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return true;
    },
  );
});

test('login returns auth response for valid credentials on verified user', async () => {
  process.env.AUTH_MODE = 'local';
  process.env.AUTH_LOCAL_JWT_SECRET = 'a'.repeat(32);
  process.env.AUTH_LOCAL_ISSUER = 'fulfilmentkit-tests';

  const password = 'correct-password';
  const salt = 'salt';
  const hash = '00af266e5980b4c8f570c335920947d27402da0ac29b38f43233590523262348';
  const service = createAuthService({
    user: { id: 'user-1', email: 'demo@example.com' },
    passwordHash: `${salt}:${hash}`,
    emailVerifiedAt: new Date('2025-01-01T00:00:00.000Z'),
  });

  const result = await service.login({ email: 'demo@example.com', password });

  assert.equal(typeof result.token, 'string');
  assert.deepEqual(result.user, { id: 'user-1', email: 'demo@example.com' });
});
