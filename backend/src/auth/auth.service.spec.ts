import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

function createAuthService(params: {
  user:
    | {
        id: string;
        email: string | null;
        passwordHash: string | null;
        emailVerified: boolean;
        onboardingCompleted: boolean;
      }
    | null;
}) {
  const prisma = {
    user: {
      findFirst: async () => params.user,
    },
  };

  return new AuthService(prisma as never);
}

test('login throws UnauthorizedException for invalid credentials', async () => {
  const service = createAuthService({
    user: {
      id: 'user-1',
      email: 'demo@example.com',
      passwordHash: 'salt:wrong-hash',
      emailVerified: true,
      onboardingCompleted: false,
    },
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
    user: {
      id: 'user-1',
      email: 'demo@example.com',
      passwordHash: `${salt}:${hash}`,
      emailVerified: false,
      onboardingCompleted: false,
    },
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
    user: {
      id: 'user-1',
      email: 'demo@example.com',
      passwordHash: `${salt}:${hash}`,
      emailVerified: true,
      onboardingCompleted: false,
    },
  });

  const result = await service.login({ email: 'demo@example.com', password });

  assert.equal(typeof result.token, 'string');
  assert.deepEqual(result.user, {
    id: 'user-1',
    email: 'demo@example.com',
    emailVerified: true,
    onboardingCompleted: false,
    nextOnboardingStep: 'complete-onboarding',
  });
});

test('register converts invited user to local identity and keeps the same user id', async () => {
  const invitedUserId = 'user-invited-1';
  const createCalls: Array<unknown> = [];
  const updateCalls: Array<unknown> = [];
  const findFirstCalls: Array<unknown> = [];
  const storedVerificationCodes: Array<{ userId: string; code: string }> = [];
  const sentVerificationCodes: Array<{ email: string; code: string }> = [];

  const prisma = {
    user: {
      findFirst: async (args: unknown) => {
        findFirstCalls.push(args);

        const where = (args as { where?: { authProvider?: string } }).where;
        if (where?.authProvider === 'local') return null;
        if (where?.authProvider === 'invited') return { id: invitedUserId };
        return null;
      },
      create: async (args: unknown) => {
        createCalls.push(args);
        return { id: 'new-user-id' };
      },
      update: async (args: unknown) => {
        updateCalls.push(args);
        return {
          id: invitedUserId,
          email: 'invited@example.com',
          timezone: null,
          locale: null,
          defaultCurrency: null,
          planningCadence: null,
          emailVerified: false,
          onboardingCompleted: false,
        };
      },
    },
  };

  const service = new AuthService(prisma as never);
  const serviceWithInternals = service as unknown as {
    storeVerificationCode: (params: { userId: string; code: string }) => Promise<void>;
    sendVerificationCodeOrThrow: (email: string, code: string) => Promise<void>;
  };
  serviceWithInternals.storeVerificationCode = async (params: {
    userId: string;
    code: string;
  }) => {
    storedVerificationCodes.push(params);
  };
  serviceWithInternals.sendVerificationCodeOrThrow = async (email: string, code: string) => {
    sentVerificationCodes.push({ email, code });
  };

  const result = await service.register({
    email: ' Invited@Example.com ',
    password: 'strong-password',
    plan: 'starter',
  });

  assert.equal(createCalls.length, 0);
  assert.equal(updateCalls.length, 1);
  assert.equal(
    (updateCalls[0] as { where: { id: string } }).where.id,
    invitedUserId,
  );
  assert.equal(storedVerificationCodes.length, 1);
  assert.equal(storedVerificationCodes[0].userId, invitedUserId);
  assert.equal(sentVerificationCodes.length, 1);
  assert.equal(sentVerificationCodes[0].email, 'invited@example.com');
  assert.equal(result.user.id, invitedUserId);
  assert.equal(result.user.email, 'invited@example.com');
  assert.deepEqual(
    findFirstCalls.map(
      (call) => (call as { where: { authProvider: string } }).where.authProvider,
    ),
    ['local', 'invited'],
  );
});

test('register for non-invited user still creates and updates a new local user', async () => {
  const createCalls: Array<unknown> = [];
  const updateCalls: Array<unknown> = [];
  const findFirstCalls: Array<unknown> = [];
  const storedVerificationCodes: Array<{ userId: string; code: string }> = [];
  const sentVerificationCodes: Array<{ email: string; code: string }> = [];

  const prisma = {
    user: {
      findFirst: async (args: unknown) => {
        findFirstCalls.push(args);
        return null;
      },
      create: async (args: unknown) => {
        createCalls.push(args);
        return { id: 'new-local-user-id' };
      },
      update: async (args: unknown) => {
        updateCalls.push(args);
        return {
          id: 'new-local-user-id',
          email: 'new@example.com',
          timezone: null,
          locale: null,
          defaultCurrency: null,
          planningCadence: null,
          emailVerified: false,
          onboardingCompleted: false,
        };
      },
    },
  };

  const service = new AuthService(prisma as never);
  const serviceWithInternals = service as unknown as {
    storeVerificationCode: (params: { userId: string; code: string }) => Promise<void>;
    sendVerificationCodeOrThrow: (email: string, code: string) => Promise<void>;
  };
  serviceWithInternals.storeVerificationCode = async (params: {
    userId: string;
    code: string;
  }) => {
    storedVerificationCodes.push(params);
  };
  serviceWithInternals.sendVerificationCodeOrThrow = async (email: string, code: string) => {
    sentVerificationCodes.push({ email, code });
  };

  const result = await service.register({
    email: 'New@Example.com',
    password: 'strong-password',
  });

  assert.equal(createCalls.length, 1);
  assert.equal(updateCalls.length, 1);
  assert.equal(
    (createCalls[0] as { data: { email: string; authProvider: string } }).data.email,
    'new@example.com',
  );
  assert.equal(
    (createCalls[0] as { data: { email: string; authProvider: string } }).data.authProvider,
    'local',
  );
  assert.equal(
    (updateCalls[0] as { where: { id: string } }).where.id,
    'new-local-user-id',
  );
  assert.equal(storedVerificationCodes.length, 1);
  assert.equal(storedVerificationCodes[0].userId, 'new-local-user-id');
  assert.equal(sentVerificationCodes.length, 1);
  assert.equal(sentVerificationCodes[0].email, 'new@example.com');
  assert.equal(result.user.id, 'new-local-user-id');
  assert.deepEqual(findFirstCalls.length, 2);
});
