# FulfilmentKit Frontend Validation Policy

## 1. Zod Usage

- Zod is the single schema validation library used for frontend API contract validation.
- All API responses must be validated at the module API boundary (`src/modules/<module>/api.ts`).

## 2. Schema Location Pattern

- Schemas live inside each module:
  - `src/modules/<module>/schemas.ts`
- There is no global shared API contract folder.
- Shared validation utilities live in:
  - `src/lib/validation`

## 3. Strict vs Tolerant Strategy

- Strict parsing at the API boundary is required using `parseOrThrow`.
- Critical screens and domains (AI, planning, finance, dashboard, orders) must use `parseOrThrow` for response validation.
- Tolerance is allowed only through `.passthrough()` usage inside schemas for forward compatibility with additive backend fields.
- `safeParse` should not be used directly in feature modules unless intentionally designed for a documented non-throw flow.

## 4. Standard Validation Flow

- Standard flow:
  - `apiClient` → module `api.ts` → `parseOrThrow` → `ApiError` → `FkError`
- Validation failures must normalize to:
  - `ApiError.code = "BACKEND_ERROR"`
  - `ApiError.details.code = "VALIDATION_ERROR"`

## 5. Future Workspace Contract

- No concrete workspace response schema exists yet.
- When backend workspace endpoints are implemented, a dedicated module-level schema must be added under:
  - `src/modules/workspaces/schemas.ts`
- Workspace response parsing must follow the `parseOrThrow` standard.
