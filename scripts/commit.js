#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');

try {
  execSync('node scripts/pre-commit-check.js', { stdio: 'inherit' });
} catch {
  process.exit(1);
}

const result = spawnSync('npx', ['cz'], {
  stdio: 'inherit',
  env: { ...process.env, SKIP_PRE_COMMIT: '1' },
  shell: true,
});

process.exit(result.status ?? 0);
