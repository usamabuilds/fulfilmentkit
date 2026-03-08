## Permanent Rules — Apply to Every Task

1. Never use `any` types — all code must be fully typed with TypeScript
2. Never use `localStorage` or `sessionStorage` — use Zustand stores instead
3. Never call `fetch()` directly in components — always use the API client in lib/api/client.ts
4. Never use inline styles — use Tailwind classes only
5. Never modify any files in backend/
6. Never use Pages Router — App Router only
7. Never use shadcn/ui or any third-party component library — build all components from scratch using Tailwind and Framer Motion
8. All components must use the glass design system defined in globals.css
9. Only touch files explicitly mentioned in the task
10. If you cannot complete something without violating these rules, stop and report the blocker
11. After every task run `pnpm build` from `frontend/` and confirm zero errors before committing
12. Never push — commit only, the user handles pushing
