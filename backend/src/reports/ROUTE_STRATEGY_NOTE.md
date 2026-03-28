# Reports Route Strategy (Pre-Implementation Note)

## Decision

**Chosen option: Option A (recommended).**

- Keep the controller route at `@Controller('reports')` so the backend public API remains rooted at `/reports`.
- During implementation, move/host the reports controller and reports service within the `orders` module for module ownership and organization.

## Compatibility Intent

- With `/reports` preserved, frontend endpoint and route-link updates are **optional/minimal**.
- Existing report API calls and report page links can remain unchanged.

## Option B Impact (if route is changed to `@Controller('orders/reports')`)

If we choose Option B later, these frontend files must be updated to reflect `/orders/reports` URL changes.

### Endpoint URL updates

- `frontend/src/lib/api/endpoints/reports.ts`
  - Update `list`, `run`, `getRun`, and export URL construction from `/reports/...` to `/orders/reports/...`.

### Report page and link updates

- `frontend/src/app/(app)/reports/page.tsx`
  - Update links currently generated as `/reports/${report.key}`.
- `frontend/src/app/(app)/reports/[reportKey]/page.tsx`
  - Update router replacement paths and the `/reports` back link.
- `frontend/src/lib/nav/modules.ts`
  - Update reports module `basePath` and all report sub-links currently under `/reports`.

## Summary

Option A preserves the existing `/reports` contract and minimizes frontend churn while still allowing backend module co-location under `orders`.
