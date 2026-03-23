import { z } from 'zod';

export const authModeSchema = z.enum(['local', 'supabase', 'hybrid']);

export const envSchema = z
  .object({
    // Server
    PORT: z.coerce.number().int().positive(),
    API_BASE_URL: z.string().url(),

    // Database
    DATABASE_URL: z.string().min(1),

    // Redis
    REDIS_URL: z.string().min(1),

    // Connection secrets (REQUIRED)
    // Used to encrypt OAuth tokens / API keys before storing in DB
    CONNECTION_SECRET_KEY: z.string().min(32),

    // Auth
    AUTH_MODE: authModeSchema.default('local'),
    JWT_SECRET: z.string().min(1).optional(),
    SUPABASE_JWT_SECRET: z.string().min(1).optional(),
    SUPABASE_JWT_ISSUER: z.string().min(1).optional(),

    // AI (reserved for later use)
    AI_PROVIDER: z.string().min(1),
    OPENAI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().min(1),

    // Shopify
    SHOPIFY_CLIENT_ID: z.string().min(1),
    SHOPIFY_CLIENT_SECRET: z.string().min(1),
    SHOPIFY_SCOPES: z.string().min(1),
    SHOPIFY_REDIRECT_URI: z.string().url(),

    // Xero
    XERO_CLIENT_ID: z.string().min(1),
    XERO_CLIENT_SECRET: z.string().min(1),
    XERO_SCOPES: z.string().min(1),
    XERO_REDIRECT_URI: z.string().url(),

    // Zoho
    ZOHO_CLIENT_ID: z.string().min(1),
    ZOHO_CLIENT_SECRET: z.string().min(1),
    ZOHO_SCOPES: z.string().min(1),
    ZOHO_REDIRECT_URI: z.string().url(),

    // Node environment
    NODE_ENV: z.enum(['development', 'production']).default('development'),
  })
  .superRefine((env, ctx) => {
    if ((env.AUTH_MODE === 'local' || env.AUTH_MODE === 'hybrid') && !env.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: `JWT_SECRET is required when AUTH_MODE=${env.AUTH_MODE}`,
      });
    }

    if (
      (env.AUTH_MODE === 'supabase' || env.AUTH_MODE === 'hybrid') &&
      !env.SUPABASE_JWT_SECRET
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_JWT_SECRET'],
        message: `SUPABASE_JWT_SECRET is required when AUTH_MODE=${env.AUTH_MODE}`,
      });
    }

    if (
      (env.AUTH_MODE === 'supabase' || env.AUTH_MODE === 'hybrid') &&
      !env.SUPABASE_JWT_ISSUER
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_JWT_ISSUER'],
        message: `SUPABASE_JWT_ISSUER is required when AUTH_MODE=${env.AUTH_MODE}`,
      });
    }
  });

export type EnvVars = z.infer<typeof envSchema>;

export type AuthRuntimeConfig = {
  mode: z.infer<typeof authModeSchema>;
  local: { issuer: 'fulfilmentkit-local'; secret: string } | null;
  supabase: { issuer: string; secret: string } | null;
};

export function getAuthRuntimeConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): AuthRuntimeConfig {
  const parsed = envSchema.parse(env);

  if (parsed.AUTH_MODE === 'local') {
    return {
      mode: parsed.AUTH_MODE,
      local: { issuer: 'fulfilmentkit-local', secret: parsed.JWT_SECRET! },
      supabase: null,
    };
  }

  if (parsed.AUTH_MODE === 'supabase') {
    return {
      mode: parsed.AUTH_MODE,
      local: null,
      supabase: {
        issuer: parsed.SUPABASE_JWT_ISSUER!,
        secret: parsed.SUPABASE_JWT_SECRET!,
      },
    };
  }

  return {
    mode: parsed.AUTH_MODE,
    local: { issuer: 'fulfilmentkit-local', secret: parsed.JWT_SECRET! },
    supabase: {
      issuer: parsed.SUPABASE_JWT_ISSUER!,
      secret: parsed.SUPABASE_JWT_SECRET!,
    },
  };
}
