#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run('pnpm', ['exec', 'prisma', 'generate']);
run('git', ['diff', '--exit-code', '--', 'src/generated/prisma']);
