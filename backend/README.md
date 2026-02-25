# FulfilmentKit Backend

## Requirements
- Node.js LTS (v20.x)
- Docker Desktop
- Git

## Local setup
1) Install dependencies
```bash
npm install
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
