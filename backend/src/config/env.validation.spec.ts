import assert from 'node:assert/strict';
import { envSchema } from './env.validation';

const baseEnv = {
  PORT: '3000',
  API_BASE_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://localhost:5432/fulfilmentkit',
  REDIS_URL: 'redis://localhost:6379',
  CONNECTION_SECRET_KEY: 'a'.repeat(32),
  AI_PROVIDER: 'openai',
  AI_MODEL: 'gpt-4o-mini',
  NODE_ENV: 'development',
};

function parse(env: Record<string, string | undefined>) {
  return envSchema.safeParse({
    ...baseEnv,
    ...env,
  });
}

function expectFailure(
  env: Record<string, string | undefined>,
  expectedPath: string,
  expectedMessageIncludes: string,
) {
  const result = parse(env);
  assert.equal(result.success, false, `Expected parse to fail for ${expectedPath}`);

  const issues = result.error.issues;
  const issue = issues.find((entry) => entry.path.join('.') === expectedPath);

  assert.ok(issue, `Expected issue for path "${expectedPath}", got: ${JSON.stringify(issues)}`);
  assert.ok(
    issue.message.includes(expectedMessageIncludes),
    `Expected issue message to include "${expectedMessageIncludes}", got "${issue.message}"`,
  );
}

function expectSuccess(env: Record<string, string | undefined>) {
  const result = parse(env);
  assert.equal(result.success, true, `Expected parse to succeed, got: ${JSON.stringify(result)}`);
}

expectSuccess({
  AUTH_MODE: 'local',
  JWT_SECRET: 'b'.repeat(32),
});

expectSuccess({
  AUTH_MODE: 'supabase',
  SUPABASE_JWT_SECRET: 'c'.repeat(32),
  SUPABASE_JWT_ISSUER: 'https://project-id.supabase.co/auth/v1',
});

expectSuccess({
  AUTH_MODE: 'hybrid',
  JWT_SECRET: 'd'.repeat(32),
  SUPABASE_JWT_SECRET: 'e'.repeat(32),
  SUPABASE_JWT_ISSUER: 'https://project-id.supabase.co/auth/v1',
});

expectFailure(
  {
    AUTH_MODE: 'local',
  },
  'JWT_SECRET',
  'JWT_SECRET is required when AUTH_MODE=local',
);

expectFailure(
  {
    AUTH_MODE: 'supabase',
  },
  'SUPABASE_JWT_SECRET',
  'SUPABASE_JWT_SECRET is required when AUTH_MODE=supabase',
);

expectFailure(
  {
    AUTH_MODE: 'supabase',
    SUPABASE_JWT_SECRET: 'c'.repeat(32),
  },
  'SUPABASE_JWT_ISSUER',
  'SUPABASE_JWT_ISSUER is required when AUTH_MODE=supabase',
);

expectFailure(
  {
    AUTH_MODE: 'hybrid',
    JWT_SECRET: 'd'.repeat(32),
    SUPABASE_JWT_ISSUER: 'https://project-id.supabase.co/auth/v1',
  },
  'SUPABASE_JWT_SECRET',
  'SUPABASE_JWT_SECRET is required when AUTH_MODE=hybrid',
);

console.log('env.validation.spec.ts: all checks passed');
