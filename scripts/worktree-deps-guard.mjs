// Dependency preflight for managed worktrees.
//
// A worktree normally reuses the primary checkout's node_modules. That is only
// a valid input when both checkouts carry the same lockfiles and Node ABI.
// Reusing a tree from an older branch (or one installed with --omit=optional)
// makes esbuild/tsc/eslint produce false results - most visibly "committed cron
// bundles are stale" - and sends an agent to edit unrelated files.
//
// `scripts/build-cron-bundles.mjs` calls this before bundling, `wt check`,
// `wt ship`, `wt status` and `wt resume` report the same state, and `wt create`
// installs an isolated tree when reuse would be invalid. Outside a managed
// worktree (CI, the primary checkout) the check is a no-op.

import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  'coverage',
  'test-results',
  'playwright-report',
  'output',
]);

function lockfilesUnder(root) {
  const found = [];
  const walk = (dir, depth) => {
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (depth > 0 && !SKIP.has(entry.name)) walk(join(dir, entry.name), depth - 1);
      } else if (entry.name === 'package-lock.json') {
        found.push(join(root, dir, entry.name));
      }
    }
  };
  walk('', 2);
  return found.sort();
}

function fingerprint(root) {
  const hash = createHash('sha256');
  for (const file of lockfilesUnder(root)) {
    hash.update(relative(root, file));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  hash.update(`${process.platform}-${process.arch}-modules-${process.versions.modules}`);
  return hash.digest('hex').slice(0, 16);
}

function worktreeName(root) {
  try {
    return (
      readFileSync(join(root, '.worktree.local'), 'utf8').match(/INSIGHT_WT_NAME='([^']+)'/)?.[1] ??
      (root.split('/').pop() || '<name>')
    );
  } catch {
    return root.split('/').pop() || '<name>';
  }
}

// Throws an actionable error when node_modules cannot be trusted for this
// checkout. Returns silently when the worktree is outside the managed flow.
export function assertWorktreeDependencies(root = process.cwd()) {
  if (!existsSync(join(root, '.worktree.local'))) return;

  const modulesPath = join(root, 'node_modules');
  const name = worktreeName(root);
  if (!existsSync(modulesPath)) {
    throw new Error(
      '[worktree-deps] node_modules is missing in this worktree.\n' +
        `  fix: npm run wt -- deps ${name} --isolate`
    );
  }

  let sourceRoot = root;
  if (lstatSync(modulesPath).isSymbolicLink()) {
    sourceRoot = dirname(realpathSync(modulesPath));
  }

  const wanted = fingerprint(root);
  const actual = fingerprint(sourceRoot);
  if (wanted !== actual) {
    let linked = '';
    try {
      const state = JSON.parse(readFileSync(join(root, '.worktree-deps.json'), 'utf8'));
      if (state?.recordedAt)
        linked = `  linked:   ${state.recordedAt} via ${state.task ?? 'create'}\n`;
    } catch {
      // old worktree before the deps-state file existed
    }
    throw new Error(
      "[worktree-deps] node_modules does not match this branch's lockfiles.\n" +
        `  worktree: ${wanted}\n` +
        `  source:   ${actual} (${sourceRoot})\n` +
        '  effect:   typecheck, lint and build:cron:check would report false results (often "cron bundles stale").\n' +
        `  fix:      npm run wt -- deps ${name} --isolate\n` +
        linked
    );
  }
}

if (process.argv[1]?.endsWith('worktree-deps-guard.mjs')) {
  try {
    assertWorktreeDependencies();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
