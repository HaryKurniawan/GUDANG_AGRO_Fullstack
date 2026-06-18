#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const SEP = '='.repeat(50);

function log(msg) {
  console.log(msg);
}

function header(title) {
  log('');
  log(SEP);
  log(`  ${title}`);
  log(SEP);
}

function success(msg) {
  log(`  ✅  ${msg}`);
}

function warn(msg) {
  log(`  ⚠️   ${msg}`);
}

function fail(msg) {
  log(`  ❌  ${msg}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ── 1. ESLint via lint-staged ─────────────────────────────────────────────
header('Menjalankan ESLint (lint-staged)');
try {
  run('npx lint-staged');
  success('ESLint selesai — tidak ada error!');
} catch {
  fail('ESLint menemukan error. Perbaiki sebelum commit.');
  process.exit(1);
}

// ── 2. npm audit (warning only) ───────────────────────────────────────────
header('Menjalankan npm audit');
try {
  run('npm audit --audit-level=critical');
  success('npm audit selesai — tidak ada kerentanan kritis.');
} catch {
  warn('npm audit menemukan isu. Review disarankan, tidak memblokir commit.');
  warn('Jalankan: npm audit fix  untuk memperbaiki.');
}

// ── Selesai ───────────────────────────────────────────────────────────────
log('');
log(SEP);
log('  ✅  Semua pengecekan selesai! Lanjut ke pesan commit...');
log(SEP);
log('');
