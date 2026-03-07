## Permanent Rules — Apply to Every Task

These rules are non-negotiable and apply to every task in this repository:

1. Never add stub files, declaration files, or .d.ts files to work around missing types
2. Never set noImplicitAny: false in tsconfig
3. Never add index signatures like [key: string]: any to PrismaService
4. Never weaken TypeScript configuration in any way
5. Never use git push . — always use git push origin DEV
6. Only touch files explicitly mentioned in the task
7. If you cannot fix something without violating these rules, stop and report the blocker instead

Violating any of these rules is worse than not completing the task.