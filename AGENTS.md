# FulfilmentKit Codex Operating Rules (Locked)

Default behavior
- Strictly follow the existing architecture and folder structure.
- Do not refactor or redesign unless the task explicitly requests it.
- Make the smallest change that completes the checklist.
- Never rename existing routes, modules, query keys, APIs, or env vars unless explicitly requested.
- Keep routes thin: no business logic in src/app routes (frontend).
- Keep modules as source of truth: api.ts + schemas.ts + types.ts + hooks + components (frontend).

Risk challenge behavior (allowed)
- If you detect a structural risk (security, data loss, multi-tenant leakage, broken invariants, env mismatch, migration danger, idempotency bug, or production footgun):
  1) STOP and write a short "Risk Check" section.
  2) State the risk, why it matters, and the smallest safe mitigation.
  3) Continue the task only within scope unless explicitly asked to expand scope.

Execution rules
- One task equals one focused scope.
- Always run the minimal verification command(s) relevant to the change (lint/build/test) and report results.
- Output must end with: "What changed", "How to verify", "Risks noticed (if any)".
