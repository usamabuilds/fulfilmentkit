# FulfilmentKit Backend

## Requirements
- Node.js LTS (v20.x)
- Docker Desktop
- Git

## Authentication modes (`AUTH_MODE`)
The backend supports three authentication modes, with `AUTH_MODE` as the single source of truth:

- `local` (default)
- `supabase`
- `hybrid`

### Required auth variables by mode
- `AUTH_MODE=local`
  - Required: `JWT_SECRET`
- `AUTH_MODE=supabase`
  - Required: `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_ISSUER`
- `AUTH_MODE=hybrid`
  - Required: `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_ISSUER`

### Issuer and secret routing
- Local tokens are signed and verified with:
  - `iss = fulfilmentkit-local`
  - `JWT_SECRET`
- Supabase tokens are verified with:
  - `iss = SUPABASE_JWT_ISSUER`
  - `SUPABASE_JWT_SECRET`
- In `hybrid` mode, verification is routed strictly by the JWT `iss` claim:
  - `iss=fulfilmentkit-local` → local secret
  - `iss=SUPABASE_JWT_ISSUER` → supabase secret
  - unknown or missing issuer is rejected

## Prisma client generation
- Canonical generated Prisma client path: `src/generated/prisma` (from `prisma/schema.prisma`).
- Generate client: `pnpm run prisma:generate`
- CI/static guard for generated sync: `pnpm run prisma:check-generated`

## Local setup
1) Install dependencies
```bash
npm install
```

## Deployment (Render)

Target: Render Web Service + Render PostgreSQL

### Required environment variables (Render)
Set these in Render for the Web Service:

- NODE_ENV=production
- PORT=3000
- DATABASE_URL=<render postgres internal url>
- REDIS_URL=<your redis url>
- AUTH_SECRET=<set a value, even if unused now>
- LOG_LEVEL=info

AI keys are optional for now:
- AI_PROVIDER=openai
- OPENAI_API_KEY=
- AI_MODEL=gpt-4o-mini
- AI_DATA_SCOPE=internal_only
- AI_ALLOW_RAW_DB=false

### Build and start commands (Render)
Use these settings on Render:

Build Command:
- pnpm install --frozen-lockfile
- pnpm run build

Start Command:
- pnpm run start

### Database migrations (Render)
Production deployments must run:

- pnpm exec prisma migrate deploy

Important:
- Do NOT use prisma migrate dev in production
- Migrations live in prisma/migrations and must be committed

### Local parity (recommended checks)
Before deploying:
- npm run build
- set NODE_ENV=production and boot locally
- ensure DATABASE_URL and REDIS_URL point to reachable services
