import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

class AuthServiceMock {
  async login(params: { email: string; password: string }) {
    const email = params.email.trim().toLowerCase();

    if (email === 'invalid@example.com') {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (email === 'unverified@example.com') {
      throw new ForbiddenException({
        message: 'Email address is not verified',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return {
      token: 'token-1',
      user: {
        id: 'user-1',
        email,
      },
    };
  }
}

test('POST /auth/login invalid credentials keeps UnauthorizedException distinct', async () => {
  const controller = new AuthController(new AuthServiceMock() as any);

  await assert.rejects(
    async () => controller.login({ email: 'invalid@example.com', password: 'password123' }),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      assert.equal(error.message, 'Invalid credentials');
      return true;
    },
  );
});

test('POST /auth/login unverified email keeps ForbiddenException with EMAIL_NOT_VERIFIED code', async () => {
  const controller = new AuthController(new AuthServiceMock() as any);

  await assert.rejects(
    async () => controller.login({ email: 'unverified@example.com', password: 'password123' }),
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

test('POST /auth/login verified user returns auth payload', async () => {
  const controller = new AuthController(new AuthServiceMock() as any);

  const response = await controller.login({
    email: 'verified@example.com',
    password: 'password123',
  });

  assert.deepEqual(response, {
    success: true,
    data: {
      token: 'token-1',
      user: {
        id: 'user-1',
        email: 'verified@example.com',
      },
    },
  });
});
