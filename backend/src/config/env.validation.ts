import { z } from 'zod';

export const authModeSchema = z.enum(['local', 'supabase', 'hybrid']);

const baseEnvSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive(),
  API_BASE_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // Auth
  AUTH_MODE: authModeSchema.default('local'),
  JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  SUPABASE_JWT_ISSUER: z.string().url().optional(),

  // Connection secrets (REQUIRED)
  // Used to encrypt OAuth tokens / API keys before storing in DB
  CONNECTION_SECRET_KEY: z.string().min(32),

  // AI (reserved for later use)
  AI_PROVIDER: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1),

  // Node environment
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export const envSchema = baseEnvSchema.superRefine((env, ctx) => {
  const requireJwtSecret = env.AUTH_MODE === 'local' || env.AUTH_MODE === 'hybrid';
  const requireSupabaseSecret = env.AUTH_MODE === 'supabase' || env.AUTH_MODE === 'hybrid';

  if (requireJwtSecret && !env.JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: `JWT_SECRET is required when AUTH_MODE=${env.AUTH_MODE}`,
    });
  }

  if (requireSupabaseSecret && !env.SUPABASE_JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPABASE_JWT_SECRET'],
      message: `SUPABASE_JWT_SECRET is required when AUTH_MODE=${env.AUTH_MODE}`,
    });
  }

  if (requireSupabaseSecret && !env.SUPABASE_JWT_ISSUER) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPABASE_JWT_ISSUER'],
      message: `SUPABASE_JWT_ISSUER is required when AUTH_MODE=${env.AUTH_MODE}`,
    });
  }
});

export type EnvVars = z.infer<typeof envSchema>;

export type AuthRuntimeConfig = {
  mode: EnvVars['AUTH_MODE'];
  local: {
    issuer: 'fulfilmentkit-local';
    secret: string;
  } | null;
  supabase: {
    issuer: string;
    secret: string;
  } | null;
};

export function getAuthRuntimeConfig(env: NodeJS.ProcessEnv): AuthRuntimeConfig {
  const parsed = envSchema.parse(env);

  return {
    mode: parsed.AUTH_MODE,
    local:
      parsed.AUTH_MODE === 'local' || parsed.AUTH_MODE === 'hybrid'
        ? {
            issuer: 'fulfilmentkit-local',
            secret: parsed.JWT_SECRET as string,
          }
        : null,
    supabase:
      parsed.AUTH_MODE === 'supabase' || parsed.AUTH_MODE === 'hybrid'
        ? {
            issuer: parsed.SUPABASE_JWT_ISSUER as string,
            secret: parsed.SUPABASE_JWT_SECRET as string,
          }
        : null,
  };
}
