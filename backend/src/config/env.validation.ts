import { z } from 'zod';

export const envSchema = z.object({
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

  // AI (reserved for later use)
  AI_PROVIDER: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1),

  // Node environment
  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export type EnvVars = z.infer<typeof envSchema>;
