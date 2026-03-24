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
  SHOPIFY_CLIENT_ID: 'shopify-client-id',
  SHOPIFY_CLIENT_SECRET: 'shopify-client-secret',
  SHOPIFY_SCOPES: 'read_products,write_products',
  SHOPIFY_REDIRECT_URI: 'https://app.example.com/auth/shopify/callback',
  XERO_CLIENT_ID: 'xero-client-id',
  XERO_CLIENT_SECRET: 'xero-client-secret',
  XERO_SCOPES: 'openid profile email accounting.transactions',
  XERO_REDIRECT_URI: 'https://app.example.com/auth/xero/callback',
  ZOHO_CLIENT_ID: 'zoho-client-id',
  ZOHO_CLIENT_SECRET: 'zoho-client-secret',
  ZOHO_SCOPES: 'ZohoInventory.items.READ,ZohoInventory.settings.READ',
  ZOHO_REDIRECT_URI: 'https://app.example.com/auth/zoho/callback',
  QUICKBOOKS_CLIENT_ID: 'quickbooks-client-id',
  QUICKBOOKS_CLIENT_SECRET: 'quickbooks-client-secret',
  QUICKBOOKS_SCOPES: 'com.intuit.quickbooks.accounting',
  QUICKBOOKS_REDIRECT_URI: 'https://app.example.com/auth/quickbooks/callback',
  QUICKBOOKS_ENVIRONMENT: 'sandbox',
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

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    SHOPIFY_CLIENT_ID: undefined,
  },
  'SHOPIFY_CLIENT_ID',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    SHOPIFY_CLIENT_SECRET: undefined,
  },
  'SHOPIFY_CLIENT_SECRET',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    SHOPIFY_SCOPES: undefined,
  },
  'SHOPIFY_SCOPES',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    SHOPIFY_REDIRECT_URI: 'not-a-url',
  },
  'SHOPIFY_REDIRECT_URI',
  'Invalid URL',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    XERO_CLIENT_ID: undefined,
  },
  'XERO_CLIENT_ID',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    XERO_CLIENT_SECRET: undefined,
  },
  'XERO_CLIENT_SECRET',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    XERO_SCOPES: undefined,
  },
  'XERO_SCOPES',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    XERO_REDIRECT_URI: 'not-a-url',
  },
  'XERO_REDIRECT_URI',
  'Invalid URL',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    ZOHO_CLIENT_ID: undefined,
  },
  'ZOHO_CLIENT_ID',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    ZOHO_CLIENT_SECRET: undefined,
  },
  'ZOHO_CLIENT_SECRET',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    ZOHO_SCOPES: undefined,
  },
  'ZOHO_SCOPES',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    ZOHO_REDIRECT_URI: 'not-a-url',
  },
  'ZOHO_REDIRECT_URI',
  'Invalid URL',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    QUICKBOOKS_CLIENT_ID: undefined,
  },
  'QUICKBOOKS_CLIENT_ID',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    QUICKBOOKS_CLIENT_SECRET: undefined,
  },
  'QUICKBOOKS_CLIENT_SECRET',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    QUICKBOOKS_SCOPES: undefined,
  },
  'QUICKBOOKS_SCOPES',
  'Invalid input: expected string, received undefined',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    QUICKBOOKS_REDIRECT_URI: 'not-a-url',
  },
  'QUICKBOOKS_REDIRECT_URI',
  'Invalid URL',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    QUICKBOOKS_ENVIRONMENT: 'staging',
  },
  'QUICKBOOKS_ENVIRONMENT',
  'Invalid option: expected one of "sandbox"|"production"',
);

expectInvalid(
  {
    ...baseEnv,
    AUTH_MODE: 'local',
    JWT_SECRET: 'local-secret',
    FRONTEND_BASE_URL: 'not-a-url',
  },
  'FRONTEND_BASE_URL',
  'Invalid URL',
);

console.log('env.validation.spec.ts passed');
