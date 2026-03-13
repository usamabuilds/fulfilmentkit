import assert from 'node:assert';
import { ZodError } from 'zod';
import { envSchema, getAuthRuntimeConfig } from './env.validation';

const baseEnv = {
  PORT: '3000',
  API_BASE_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgres://localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  CONNECTION_SECRET_KEY: '12345678901234567890123456789012',
  AI_PROVIDER: 'openai',
  AI_MODEL: 'gpt-4o-mini',
  NODE_ENV: 'development',
} as const;

function expectInvalid(
  env: Record<string, string | undefined>,
  expectedPath: string,
  expectedMessage: string,
): void {
  try {
    envSchema.parse(env);
    assert.fail(`Expected env validation to fail for ${expectedPath}`);
  } catch (error: unknown) {
    assert.ok(error instanceof ZodError, 'Expected a ZodError');
    const issue = error.issues.find((item) => item.path.join('.') === expectedPath);
    assert.ok(issue, `Expected issue at path ${expectedPath}`);
    assert.strictEqual(issue.message, expectedMessage);
  }
}

const validLocal = {
  ...baseEnv,
  AUTH_MODE: 'local',
  JWT_SECRET: 'local-secret',
};

const validSupabase = {
  ...baseEnv,
  AUTH_MODE: 'supabase',
  SUPABASE_JWT_SECRET: 'supabase-secret',
  SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
};

const validHybrid = {
  ...baseEnv,
  AUTH_MODE: 'hybrid',
  JWT_SECRET: 'local-secret',
  SUPABASE_JWT_SECRET: 'supabase-secret',
  SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
};

assert.strictEqual(getAuthRuntimeConfig(validLocal).mode, 'local');
assert.strictEqual(getAuthRuntimeConfig(validLocal).local?.issuer, 'fulfilmentkit-local');
assert.strictEqual(getAuthRuntimeConfig(validLocal).supabase, null);

assert.strictEqual(getAuthRuntimeConfig(validSupabase).mode, 'supabase');
assert.strictEqual(getAuthRuntimeConfig(validSupabase).local, null);
assert.strictEqual(
  getAuthRuntimeConfig(validSupabase).supabase?.issuer,
  'https://project.supabase.co/auth/v1',
);

assert.strictEqual(getAuthRuntimeConfig(validHybrid).mode, 'hybrid');
assert.strictEqual(getAuthRuntimeConfig(validHybrid).local?.issuer, 'fulfilmentkit-local');
assert.strictEqual(
  getAuthRuntimeConfig(validHybrid).supabase?.issuer,
  'https://project.supabase.co/auth/v1',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
  },
  'JWT_SECRET',
  'JWT_SECRET is required when AUTH_MODE=local',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'supabase',
    SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
  },
  'SUPABASE_JWT_SECRET',
  'SUPABASE_JWT_SECRET is required when AUTH_MODE=supabase',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'supabase',
    SUPABASE_JWT_SECRET: 'supabase-secret',
  },
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_JWT_ISSUER is required when AUTH_MODE=supabase',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'hybrid',
    JWT_SECRET: 'local-secret',
    SUPABASE_JWT_ISSUER: 'https://project.supabase.co/auth/v1',
  },
  'SUPABASE_JWT_SECRET',
  'SUPABASE_JWT_SECRET is required when AUTH_MODE=hybrid',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'hybrid',
    JWT_SECRET: 'local-secret',
    SUPABASE_JWT_SECRET: 'supabase-secret',
  },
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_JWT_ISSUER is required when AUTH_MODE=hybrid',
);

console.log('env.validation.spec.ts passed');
