# FulfilmentKit Frontend (V1.1)

Architecture-controlled admin console for FulfilmentKit backend.

This frontend strictly consumes the existing NestJS + Prisma backend.
It does not modify backend contracts.
It adapts to them.

V1.1 goal: stable internal operations console with predictable architecture and zero chaos scaling.

---

# Core Principles

This project follows locked architectural rules.

## 1) Thin Route Rule

All files inside:

src/app/(app)/

MUST:

- Contain no business logic
- Contain no API calls
- Contain no parsing logic
- Only render PageFrame + module screen

Routes are wrappers only.
All real logic lives in modules.

---

## 2) Module Architecture (Locked Pattern)

Every feature lives in:

src/modules/<module>/

Structure:

- api.ts        → network calls (via apiClient only)
- schemas.ts    → Zod schemas for backend contract
- types.ts      → z.infer types derived from schemas
- hooks/        → React Query hooks
- components/   → module-owned UI screens

Rules:

- No fetch inside route files
- No fetch inside random components
- All API calls go through the global apiClient
- All backend responses are validated with Zod
- Critical screens use strict schema.parse(...)

Never trust backend blindly.

---

## 3) Server State vs UI State

### React Query (Server State Only)

- All server data lives in React Query
- Query keys MUST include workspaceId
- No module may create its own QueryClient
- Workspace switching clears cache

### Zustand (Strictly Limited)

Only allowed to store:

- workspace selection
- lightweight UI state if necessary

Never store:

- orders arrays
- inventory arrays
- finance data
- dashboard metrics
- planning results

Server state does NOT belong in Zustand.

---

## 4) API Layer (Single Source of Truth)

All network calls go through:

src/lib/api/client.ts

Responsibilities:

- Reads NEXT_PUBLIC_API_BASE_URL
- Injects X-Workspace-Id header
- Injects Authorization: Bearer <token> if present
- Handles query params
- Handles HTTP errors
- Throws structured ApiError objects

Signature pattern:

apiClient.get(path, queryObject)

Important:
Query object is the second argument.
Not wrapped in { query: ... }.

---

## 5) Validation Pipeline

Flow:

Backend JSON  
→ apiClient.get()  
→ Zod schema.parse(response)  
→ If invalid → throw  
→ Screen renders <FkError />

Standard error surface:

src/components/fk-error.tsx

Error types handled:

- WORKSPACE_REQUIRED
- NETWORK_ERROR
- HTTP_ERROR
- VALIDATION_ERROR
- Generic fallback

---

# Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- TanStack React Query
- Zod
- Zustand (workspace only)
- Recharts (charts)

---

# Environment Setup

Create a .env.local file in project root:

NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

This must point to the running backend.

Important:

- Only variables prefixed with NEXT_PUBLIC_ are accessible in browser
- Restart dev server after changing env variables

---

# Install Dependencies

From project root:

npm install

---

# Run Development Server

npm run dev

Open:
http://localhost:3000

---

# Build for Production

npm run build

---

# Start Production Server

npm run start

---

# Lint

npm run lint

---

# Project Structure (V1.1 Baseline)

src/
  app/
    layout.tsx
    providers.tsx
    globals.css

    (app)/
      dashboard/
      orders/
      inventory/
      finance/
      planning/
      connections/
      settings/

  components/
    fk-error.tsx
    patterns/
      PageFrame.tsx
      DataTable.tsx
      FiltersBar.tsx
      MetricCard.tsx
      Card.tsx
    ui/ (shadcn components)

  lib/
    api/
      client.ts
      errors.ts
      queryKeys.ts
    utils.ts

  modules/
    dashboard/
    orders/
    finance/
    planning/
    inventory/
    connections/
    settings/

  store/
    workspace-store.ts

---

# Backend Requirements

Backend must:

- Be running
- Accept X-Workspace-Id
- Accept Authorization: Bearer <token>
- Return JSON responses
- Match defined contracts (validated by Zod)

Decimals may be serialized as strings.
Dates are ISO strings.

---

# Definition of Done Guardrails

Every screen must implement:

- Loading state
- Empty state
- Error state

Accessibility minimums:

- Visible keyboard focus
- aria-label for icon-only buttons

Architecture rules must never be violated.

---

This is not a prototype.
This is a controlled system.

V1.1 establishes the foundation that prevents architectural chaos in future modules.