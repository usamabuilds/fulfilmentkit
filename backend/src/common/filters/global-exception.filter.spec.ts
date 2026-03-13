import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

test('GlobalExceptionFilter keeps explicit error code from HttpException payload', () => {
  const filter = new GlobalExceptionFilter();

  let statusCode: number | undefined;
  let jsonBody: unknown;

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (status: number) => {
          statusCode = status;
          return {
            json: (body: unknown) => {
              jsonBody = body;
            },
          };
        },
      }),
      getRequest: () => ({
        originalUrl: '/auth/login',
      }),
    }),
  };

  filter.catch(
    new ForbiddenException({
      message: 'Email address is not verified',
      code: 'EMAIL_NOT_VERIFIED',
    }),
    host as any,
  );

  assert.equal(statusCode, 403);
  assert.equal((jsonBody as any).error.code, 'EMAIL_NOT_VERIFIED');
  assert.equal((jsonBody as any).error.message, 'Email address is not verified');
});
