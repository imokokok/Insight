#!/usr/bin/env node
// Pre-commit check planner.
//
// Runs the local static checks in parallel, and skips the generated-artifact
// checks whose inputs were not touched by the staged change. The authoritative
// full run stays in CI (`npm run validate:ci` still executes every check), so a
// path-scoped skip only removes redundant local work, never coverage.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scripts = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
).scripts;

const staged = stagedPaths();

const checks = [];

// Type checking. CI keeps the authoritative `tsc --noEmit` run; tsgo is the
// same compiler implemented natively, so it reports the same diagnostics
// about an order of magnitude faster. A commit that stages no code and no
// tsconfig cannot introduce a type error, so it is skipped there.
if (
  staged.length === 0 ||
  touches(
    staged,
    /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/,
    /^tsconfig[^/]*\.json$/,
    /\/(?:tsconfig|jsconfig)[^/]*\.json$/,
    /^package\.json$/
  )
) {
  checks.push('typecheck:fast');
}

// Workflow security only reads .github/workflows; the mainline governance
// check reads protocol/, the workflow directory, the published coverage-trust
// document, vercel.json and its own helper under scripts/lib.
if (
  staged.length === 0 ||
  touches(
    staged,
    /^\.github\/workflows\//,
    /^protocol\//,
    /^public\/\.well-known\//,
    /^vercel\.json$/,
    /^scripts\/lib\//
  )
) {
  checks.push('workflow:check', 'protocol:check');
}

// Every db:check:* generator embeds its SQL as a literal and only compares it
// with the committed file under supabase/migrations (verified: the generators
// import node builtins only), so nothing outside those two directories can
// change the outcome.
if (staged.length === 0 || touches(staged, /^scripts\/migrations\//, /^supabase\/migrations\//)) {
  checks.push(...Object.keys(scripts).filter((name) => name.startsWith('db:check:')));
}

// Cron bundles are built from scripts/*.ts, which import from src/**.
if (
  staged.length === 0 ||
  touches(staged, /^(src|scripts)\//, /^\.github\/cron-dist\//, /^(package|tsconfig)\.json$/)
) {
  checks.push('build:cron:check');
}

// The MCP catalog is derived from src/mcp/tools only (verified: no parent
// imports), then formatted with the repository Prettier config.
if (
  staged.length === 0 ||
  touches(
    staged,
    /^src\/mcp\//,
    /^public\/\.well-known\/mcp\//,
    /^scripts\/generate-mcp-catalog\./,
    /^\.prettierrc/
  )
) {
  checks.push('generate:mcp-catalog:check');
}

const runner = join(dirname(fileURLToPath(import.meta.url)), 'run-checks-parallel.mjs');
const result = spawnSync(process.execPath, [runner, ...checks], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

function stagedPaths() {
  try {
    const output = execFileSync(
      'git',
      ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'],
      {
        encoding: 'utf8',
      }
    );
    return output.split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function touches(paths, ...patterns) {
  return paths.some((path) => patterns.some((pattern) => pattern.test(path)));
}
