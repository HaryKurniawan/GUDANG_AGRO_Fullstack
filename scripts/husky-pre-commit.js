#!/usr/bin/env node
'use strict';

// Jika dipanggil dari npm run commit, skip (sudah jalan pre-commit-check.js sebelumnya)
if (process.env.SKIP_PRE_COMMIT === '1') {
  console.log('    Pre-commit dilewati (sudah dijalankan via npm run commit)');
  process.exit(0);
}

// Dipanggil langsung dari git commit — jalankan pengecekan
const { execSync } = require('child_process');
try {
  execSync('node scripts/pre-commit-check.js', { stdio: 'inherit' });
} catch {
  process.exit(1);
}
